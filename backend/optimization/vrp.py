import typing
import math
from ortools.constraint_solver import routing_enums_pb2
from ortools.constraint_solver import pywrapcp

def compute_euclidean_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> int:
    """
    Very simple Euclidean distance approximation scaled up to integers for testing.
    In a real-world scenario, you would use Haversine formula mapping to real road distances via Google Maps API.
    """
    return int(math.hypot(lat1 - lat2, lon1 - lon2) * 100000)

def create_data_model(donors: list, food_banks: list, num_vehicles: int, vehicle_capacity: int) -> dict:
    """Stores the data for the routing problem."""
    data = {}
    
    # Node 0 is the depot (can be an arbitrary central location or the first donor)
    # Assume depot is at (23.0225, 72.5714) -> Ahmedabad center
    locations = [{"name": "Depot", "lat": 23.0225, "lon": 72.5714, "demand": 0}]
    
    # Add donors (Pickups -> Positive Demand)
    for d in donors:
        locations.append({
            "name": d.get("name", "Donor"),
            "lat": d["lat"],
            "lon": d["lon"],
            "demand": d.get("surplus_kg", 0)  # Pickups increase load
        })
        
    # Add Food Banks (Dropoffs -> Negative Demand)
    for fb in food_banks:
        locations.append({
            "name": fb.get("name", "Food Bank"),
            "lat": fb["lat"],
            "lon": fb["lon"],
            "demand": -fb.get("capacity_needed_kg", 0)  # Dropoffs decrease load
        })

    num_locations = len(locations)
    
    # Calculate distance matrix
    distance_matrix = []
    for i in range(num_locations):
        row = []
        for j in range(num_locations):
            if i == j:
                row.append(0)
            else:
                dist = compute_euclidean_distance(
                    locations[i]['lat'], locations[i]['lon'],
                    locations[j]['lat'], locations[j]['lon']
                )
                row.append(dist)
        distance_matrix.append(row)
        
    data['distance_matrix'] = distance_matrix
    data['demands'] = [loc['demand'] for loc in locations]
    data['vehicle_capacities'] = [vehicle_capacity] * num_vehicles
    data['num_vehicles'] = num_vehicles
    data['depot'] = 0
    data['locations'] = locations
    
    return data

def optimize_fleet_routes(donors: list, food_banks: list, num_vehicles: int = 2, vehicle_capacity: float = 300.0) -> typing.Dict:
    """
    Solve the Vehicle Routing Problem with Capacities (CVRP) using Google OR-Tools.
    Returns the optimized routes, total distance, and node visit sequence per vehicle.
    """
    # Generate dummy data if empty for demonstration
    if not donors or not food_banks:
        print("Using dummy locations for VRP demonstration...")
        donors = [
            {"name": "Restaurant A", "lat": 23.0300, "lon": 72.5800, "surplus_kg": 50},
            {"name": "Supermarket B", "lat": 23.0400, "lon": 72.5600, "surplus_kg": 120}
        ]
        food_banks = [
            {"name": "Hope Food Bank", "lat": 23.0500, "lon": 72.5900, "capacity_needed_kg": 100},
            {"name": "Community Kitchen", "lat": 23.0100, "lon": 72.5500, "capacity_needed_kg": 70}
        ]

    data = create_data_model(donors, food_banks, num_vehicles, int(vehicle_capacity))
    
    # Create the routing index manager.
    manager = pywrapcp.RoutingIndexManager(
        len(data['distance_matrix']), data['num_vehicles'], data['depot']
    )

    # Create Routing Model.
    routing = pywrapcp.RoutingModel(manager)

    # Create and register a transit callback.
    def distance_callback(from_index, to_index):
        """Returns the distance between the two nodes."""
        # Convert from routing variable Index to distance matrix NodeIndex.
        from_node = manager.IndexToNode(from_index)
        to_node = manager.IndexToNode(to_index)
        return data['distance_matrix'][from_node][to_node]

    transit_callback_index = routing.RegisterTransitCallback(distance_callback)

    # Define cost of each arc.
    routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)

    # Add Capacity constraint.
    def demand_callback(from_index):
        """Returns the demand of the node."""
        from_node = manager.IndexToNode(from_index)
        return data['demands'][from_node]

    demand_callback_index = routing.RegisterUnaryTransitCallback(demand_callback)
    
    routing.AddDimensionWithVehicleCapacity(
        demand_callback_index,
        0,  # null capacity slack
        data['vehicle_capacities'],  # vehicle maximum capacities
        True,  # start cumul to zero
        'Capacity'
    )

    # Setting first solution heuristic.
    search_parameters = pywrapcp.DefaultRoutingSearchParameters()
    search_parameters.first_solution_strategy = (
        routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
    )
    search_parameters.local_search_metaheuristic = (
        routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
    )
    search_parameters.time_limit.FromSeconds(1)

    # Solve the problem.
    solution = routing.SolveWithParameters(search_parameters)

    # Parse solution
    result = {
        "status": "Optimal Solution Found" if solution else "No Solution Found",
        "routes": [],
        "total_distance": 0
    }

    if solution:
        total_distance = 0
        for vehicle_id in range(data['num_vehicles']):
            index = routing.Start(vehicle_id)
            route_distance = 0
            route_load = 0
            route_details = []
            
            while not routing.IsEnd(index):
                node_index = manager.IndexToNode(index)
                route_load += data['demands'][node_index]
                
                route_details.append({
                    "step": len(route_details) + 1,
                    "location_name": data['locations'][node_index]['name'],
                    "action": "Pickup" if data['demands'][node_index] > 0 else "Dropoff" if data['demands'][node_index] < 0 else "Start",
                    "load_change_kg": data['demands'][node_index],
                    "current_vehicle_load_kg": route_load
                })
                
                previous_index = index
                index = solution.Value(routing.NextVar(index))
                route_distance += routing.GetArcCostForVehicle(previous_index, index, vehicle_id)
            
            # Add final depot return
            node_index = manager.IndexToNode(index)
            route_details.append({
                "step": len(route_details) + 1,
                "location_name": data['locations'][node_index]['name'],
                "action": "End",
                "load_change_kg": 0,
                "current_vehicle_load_kg": route_load
            })
            
            # Format distance (roughly back to standard coordinates scale for visualization)
            route_dist_display = route_distance / 100000.0
            total_distance += route_dist_display
            
            result["routes"].append({
                "vehicle_id": vehicle_id + 1,
                "distance": round(route_dist_display, 2),
                "steps": route_details
            })
            
        result["total_distance"] = round(total_distance, 2)
        
    return result

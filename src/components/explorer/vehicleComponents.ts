export type ComponentCategory = 'exterior' | 'cockpit' | 'powertrain' | 'chassis'
export type InspectionFrame = 'front' | 'three-quarter' | 'side' | 'cockpit' | 'engine' | 'hero'

export interface VehicleComponent {
  id: string
  name: string
  shortName: string
  category: ComponentCategory
  categoryLabel: string
  meshMatchers: Array<string | RegExp>
  purpose: string
  facts: Array<{ label: string; value: string }>
  accentColor: string
  priority: number
  inspectionFrames: InspectionFrame[]
  preferredCardSide?: 'left' | 'right'
  anchorMatchers?: Array<string | RegExp>
  anchorOffset?: [number, number, number]
}

// Match only named, separately modeled GLB parts. The full exterior shell is
// one shared mesh, so it is intentionally not used as a broad body hotspot.
export const VEHICLE_COMPONENTS: VehicleComponent[] = [
  {
    id: 'headlights', name: 'Headlight Assemblies', shortName: 'Headlights', category: 'exterior', categoryLabel: 'EXTERIOR & AERODYNAMICS',
    meshMatchers: ['GT40_HeadLights', 'GT40_HeadLightGlass', 'GT40_HeadLightCover', 'GT40_HeadLightCover2', 'GT40_SecondaryHeadlights', 'GT40_FrontSecondaryLightGlass', 'GT40_FrontSecondaryLightSocket'],
    purpose: 'Period front lighting housed in recessed nose apertures, with separate lens, reflector and lamp details.',
    facts: [{ label: 'POSITION', value: 'FRONT NOSE' }, { label: 'ASSEMBLY', value: 'LENS + REFLECTOR' }],
    accentColor: '#f2d9c2', priority: 5, inspectionFrames: ['front', 'three-quarter', 'hero'], preferredCardSide: 'right', anchorMatchers: ['GT40_HeadLights'], anchorOffset: [.68, 0, .025],
  },
  {
    id: 'front-intake', name: 'Front Air Intake', shortName: 'Front Intake', category: 'exterior', categoryLabel: 'EXTERIOR & AERODYNAMICS',
    meshMatchers: ['GT40_FrontGrill', 'GT40_FrontGrillBar', 'GT40_FrontGrillSupport'],
    purpose: 'The open nose grille provides a path for cooling airflow through the front bodywork.',
    facts: [{ label: 'LOCATION', value: 'FRONT NOSE' }, { label: 'FORM', value: 'OPEN GRILLE' }],
    accentColor: '#f26a21', priority: 6, inspectionFrames: ['front', 'three-quarter', 'hero'], preferredCardSide: 'right', anchorMatchers: ['GT40_FrontGrill'],
  },
  {
    id: 'door-assembly', name: 'Door Assembly', shortName: 'Door', category: 'exterior', categoryLabel: 'EXTERIOR & AERODYNAMICS',
    meshMatchers: ['GT40_DoorHandleL', 'GT40_DoorHandleR', 'GT40_DoorInteriorL', 'GT40_DoorInteriorR', 'GT40_DoorTrimL', 'GT40_DoorTrimR'],
    purpose: 'The low-mounted access panels open into the tightly packaged two-seat cockpit.',
    facts: [{ label: 'ACCESS', value: 'TWIN COCKPIT DOORS' }, { label: 'DETAIL', value: 'EXTERNAL HANDLES' }],
    accentColor: '#7cc1d8', priority: 5, inspectionFrames: ['side'],
  },
  {
    id: 'wheel-tire', name: 'Wheel & Tire Assembly', shortName: 'Wheel & Tire', category: 'chassis', categoryLabel: 'CHASSIS & RUNNING GEAR',
    meshMatchers: [/^GT40_Wheel(?:FL|FR|BL|BR)$/, /^GT40_Rim(?:FL|FR|BL|BR)$/],
    purpose: 'The four corner assemblies carry the car and transfer braking, steering and drive forces to the track.',
    facts: [{ label: 'COUNT', value: 'FOUR CORNERS' }, { label: 'VISIBLE PARTS', value: 'RUBBER + ALLOY' }],
    accentColor: '#f26a21', priority: 7, inspectionFrames: ['front', 'three-quarter', 'side', 'hero'],
  },
  {
    id: 'cockpit', name: 'Two-Seat Cockpit', shortName: 'Cockpit', category: 'cockpit', categoryLabel: 'COCKPIT',
    meshMatchers: [/^GT40_(?:DriverSeat|PassengerSeat)/, /^GT40_(?:Instrument[1-8]|Speedometer|RevCounter[12])$/, /^GT40_(?:DoorInterior|InteriorBar|InteriorDoorHandle|InteriorKnob|InteriorLight|InteriorTube|InteriorVent)/, 'GT40_Pedal1', 'GT40_Pedal2', 'GT40_Pedal3', 'GT40_PassengerFootBar', 'GT40_DriverFootBar'],
    purpose: 'A compact side-by-side cockpit groups the driver controls and instruments within the GT40’s low roofline.',
    facts: [{ label: 'SEATING', value: 'TWO PLACE' }, { label: 'INSTRUMENTS', value: 'ANALOG GAUGES' }],
    accentColor: '#7cc1d8', priority: 2, inspectionFrames: ['cockpit'],
  },
  {
    id: 'steering-wheel', name: 'Steering Wheel', shortName: 'Steering Wheel', category: 'cockpit', categoryLabel: 'COCKPIT',
    meshMatchers: ['GT40_SteeringWheel1', 'GT40_SteeringWheel2', 'GT40_SteeringWheelScrews'],
    purpose: 'The driver’s primary steering control sits directly ahead of the instrument panel.',
    facts: [{ label: 'POSITION', value: 'DRIVER STATION' }, { label: 'CONTROL', value: 'FRONT-WHEEL DIRECTION' }],
    accentColor: '#d8c8a8', priority: 8, inspectionFrames: ['cockpit'], preferredCardSide: 'right',
  },
  {
    id: 'gear-selector', name: 'Gear Selector', shortName: 'Gear Selector', category: 'cockpit', categoryLabel: 'COCKPIT',
    meshMatchers: ['GT40_GearShifter', 'GT40_GearShiftCover', 'GT40_GearShiftSign'],
    purpose: 'The short cockpit-mounted lever lets the driver select a ratio through the manual transmission.',
    facts: [{ label: 'TYPE', value: 'MANUAL SELECTOR' }, { label: 'POSITION', value: 'CENTER COCKPIT' }],
    accentColor: '#d8c8a8', priority: 9, inspectionFrames: ['cockpit'],
  },
  {
    id: 'ford-v8', name: 'Ford Small-Block V8', shortName: 'Ford V8', category: 'powertrain', categoryLabel: 'ENGINE & DRIVETRAIN',
    meshMatchers: ['GT40_EngineBlock1', 'GT40_EngineBlockCaps', 'GT40_EngineCaps', 'GT40_EngineTrim1', 'GT40_EngineTrim2', 'GT40_EngineTrim3', 'GT40_Pistons1', 'GT40_Pistons2', 'GT40_EngineWires'],
    purpose: 'A compact, naturally aspirated Ford V8 sits behind the cockpit to power the rear wheels in endurance competition.',
    facts: [{ label: 'CONFIGURATION', value: 'FORD V8' }, { label: 'DISPLACEMENT', value: '302 CU IN / 4.9 L' }, { label: 'CYLINDER HEADS', value: 'GURNEY-WESLAKE' }],
    accentColor: '#f26a21', priority: 3, inspectionFrames: ['engine'], preferredCardSide: 'left',
  },
  {
    id: 'induction', name: 'Induction Assembly', shortName: 'Induction', category: 'powertrain', categoryLabel: 'ENGINE & DRIVETRAIN',
    meshMatchers: ['GT40_EngineSuperChargers', 'GT40_IntakeScrews1', 'GT40_IntakeScrews2'],
    purpose: 'The upper engine assembly routes incoming air toward the V8’s intake tract.',
    facts: [{ label: 'POSITION', value: 'ABOVE ENGINE' }, { label: 'ROLE', value: 'AIR INTAKE' }],
    accentColor: '#7cc1d8', priority: 10, inspectionFrames: ['engine'],
  },
  {
    id: 'exhaust', name: 'Exhaust & Pipework', shortName: 'Exhaust', category: 'powertrain', categoryLabel: 'ENGINE & DRIVETRAIN',
    meshMatchers: ['GT40_RearExhaust', 'GT40_EnginePipes1', 'GT40_EnginePipes2', 'GT40_EnginePipes3', 'GT40_EnginePipes4'],
    purpose: 'The visible rear pipework carries exhaust gases away from the mid-mounted engine and out through the tail.',
    facts: [{ label: 'OUTLET', value: 'REAR BODY' }, { label: 'ROUTING', value: 'ENGINE TO TAIL' }],
    accentColor: '#d8c8a8', priority: 6, inspectionFrames: ['engine'], preferredCardSide: 'left',
  },
  {
    id: 'underbody', name: 'Chassis & Underbody', shortName: 'Underbody', category: 'chassis', categoryLabel: 'CHASSIS & RUNNING GEAR',
    meshMatchers: ['GT40_Underside', 'GT40_UndersideBox', 'GT40_RearTruss', 'GT40_RearTrussSupport'],
    purpose: 'The lower structure supports the body and packages mechanical components beneath and behind the cockpit.',
    facts: [{ label: 'AREA', value: 'LOWER CHASSIS' }, { label: 'VISIBLE DETAIL', value: 'REAR STRUCTURE' }],
    accentColor: '#7cc1d8', priority: 3, inspectionFrames: ['engine'],
  },
]

export const CATEGORY_ORDER: ComponentCategory[] = ['exterior', 'cockpit', 'powertrain', 'chassis']
export const CATEGORY_LABELS: Record<ComponentCategory, string> = {
  exterior: 'EXTERIOR & AERODYNAMICS',
  cockpit: 'COCKPIT',
  powertrain: 'ENGINE & DRIVETRAIN',
  chassis: 'CHASSIS & RUNNING GEAR',
}

// Technical verification: The Henry Ford, “GT40 #1075 — A Two-Time Le Mans
// Champion” identifies the 1969-returning car’s Ford V-8, 302 cu in and
// Gurney-Weslake cylinder heads. https://www.thehenryford.org/collections/explore/articles/detail/articles/2014/03/05/gt40-1075-a-two-time-le-mans-champion

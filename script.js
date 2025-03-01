// #region units and packages
const Units = {
    MM: 'mm',
    MIL: 'mil',
    INCH: 'inch',
};

const LED_PACKAGES = {
    '0201': [0.6, 0.3],
    '0402': [1.0, 0.5],
    '0603': [1.6, 0.8],
    '0805': [2.0, 1.2],
    '1206': [3.2, 1.6],
    '1210': [3.2, 2.5],
    '3528': [3.5, 2.8],
    '2020': [2.0, 2.0],
    '3535': [3.5, 3.5],
    '5050': [5.0, 5.0],
};

const LED_PACKAGE_UNITS = Units.MM;

const MM_TO_INCH = 0.0393701;
const MIL_TO_INCH = 0.001;

function convertUnits(value, fromUnit, toUnit = Units.INCH) {
    fromUnit = fromUnit.toLowerCase();
    toUnit = toUnit.toLowerCase();

    if (fromUnit === toUnit) {
        return value;
    }

    let inInches;

    if (fromUnit === Units.MM) {
        inInches = value * MM_TO_INCH;
    } else if (fromUnit === Units.MIL) {
        inInches = value * MIL_TO_INCH;
    } else if (fromUnit === Units.INCH) {
        inInches = value;
    } else {
        throw new Error(`Unsupported 'from' unit: ${fromUnit}`);
    }

    if (toUnit === Units.MM) {
        return inInches / MM_TO_INCH;
    } else if (toUnit === Units.MIL) {
        return inInches / MIL_TO_INCH;
    } else if (toUnit === Units.INCH) {
        return inInches;
    } else {
        throw new Error(`Unsupported 'to' unit: ${toUnit}`);
    }
}

function getLedSize(package, units = Units.INCH) {
    const sizeMm = LED_PACKAGES[package.toLowerCase()];
    if (!sizeMm) {
        throw new Error(`LED Package ${package} not found.`);
    }
    return sizeMm.map((d) => convertUnits(d, LED_PACKAGE_UNITS, units));
}

// #region localstorage and data
let DEFAULT_POINTS = [
    ['D01', 17.018, 17.018],
    ['D02', 17.018, 8.382],
    ['D03', 21.082, 8.382],
    ['D04', 25.4, 4.318],
    ['D05', 29.718, 8.382],
    ['D06', 33.782, 12.7],
    ['D07', 33.782, 21.082],
    ['D10', 29.718, 29.718],
    ['D12', 17.018, 12.7],
    ['D13', 21.082, 12.7],
    ['D14', 25.4, 8.382],
    ['D15', 29.718, 12.7],
    ['D16', 33.782, 17.018],
    ['D17', 33.782, 25.4],
    ['D20', 25.4, 33.782],
    ['D21', 17.018, 33.782],
    ['D23', 21.082, 17.018],
    ['D24', 25.4, 12.7],
    ['D25', 29.718, 17.018],
    ['D26', 29.718, 21.082],
    ['D27', 29.718, 25.4],
    ['D30', 21.082, 33.782],
    ['D31', 12.7, 33.782],
    ['D32', 8.382, 29.718],
    ['D34', 25.4, 17.018],
    ['D35', 25.4, 21.082],
    ['D36', 25.4, 25.4],
    ['D37', 25.4, 29.718],
    ['D40', 12.7, 29.718],
    ['D41', 8.382, 25.4],
    ['D42', 4.318, 25.4],
    ['D43', 4.318, 21.082],
    ['D45', 21.082, 21.082],
    ['D46', 21.082, 25.4],
    ['D47', 21.082, 29.718],
    ['D50', 12.7, 25.4],
    ['D51', 8.382, 21.082],
    ['D52', 4.318, 17.018],
    ['D53', 4.318, 12.7],
    ['D54', 12.7, 4.318],
    ['D56', 17.018, 29.718],
    ['D57', 17.018, 25.4],
    ['D60', 12.7, 21.082],
    ['D61', 8.382, 17.018],
    ['D62', 8.382, 12.7],
    ['D63', 8.382, 8.382],
    ['D64', 17.018, 4.318],
    ['D65', 21.082, 4.318],
    ['D67', 17.018, 21.082],
    ['D70', 12.7, 17.018],
    ['D71', 12.7, 12.7],
    ['D72', 12.7, 8.382]
];

// Initialize points with a deep copy of DEFAULT_POINTS
let points = DEFAULT_POINTS.map(point => [...point]);

const STORAGE_KEYS = {
    POINTS_CSV: 'led-points-csv',
    POINTS_UNITS: 'led-points-units',
    LED_PACKAGE: 'led-package',
    LED_COLOR: 'led-color',
    BACKGROUND_COLOR: 'led-background-color',
    SHADER_STATE: 'led-shader-state',
};

// Load initial points from localStorage
function loadPointsFromLocalStorage() {
    try {
        const savedCSV = localStorage.getItem(STORAGE_KEYS.POINTS_CSV);
        const savedUnits = localStorage.getItem(STORAGE_KEYS.POINTS_UNITS) || Units.MM;

        if (savedCSV) {
            points = parseCSV(savedCSV, savedUnits);
        } else {
            savePointsToCSV();
        }

    } catch (e) {
        console.error('Error loading points:', e);
        // restore default points if there's an error
        points = DEFAULT_POINTS.map(point => [...point]);
        savePointsToCSV();
    }
}

function parseCSV(csvText, units = Units.MM) {
    const lines = csvText.split('\n');
    const parsedPoints = [];
    const uniqueLabelSet = new Set();

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        if (trimmed.startsWith('#')) continue;
        const parts = trimmed.split(',').map(p => p.trim());
        if (parts.length !== 3) throw new Error(`Invalid line: ${line}`);
        const label = parts[0];
        const x = parseFloat(parts[1]);
        const y = parseFloat(parts[2]);
        if (isNaN(x) || isNaN(y)) throw new Error(`Invalid numbers in line: ${line}`);

        // enforce label uniqueness
        if (uniqueLabelSet.has(label)) {
            throw new Error(`Duplicate label found: "${label}". All LED labels must be unique.`);
        }
        uniqueLabelSet.add(label);

        // Convert coordinates to mm if they're in a different unit
        if (units !== Units.MM) {
            const xInMm = convertUnits(x, units, Units.MM);
            const yInMm = convertUnits(y, units, Units.MM);
            parsedPoints.push([label, xInMm, yInMm]);
        } else {
            parsedPoints.push([label, x, y]);
        }
    }
    if (parsedPoints.length === 0) throw new Error('CSV contains no valid data');
    return parsedPoints;
}

// Update the restore function to use DEFAULT_POINTS
function restoreDefaultData() {
    // Convert DEFAULT_POINTS to CSV format
    const csv = DEFAULT_POINTS.map(p => p.join(',')).join('\n');

    // Fill the textarea with the default data CSV
    document.getElementById('import-csv-text').value = csv;

    // Clear any error messages
    document.getElementById('import-error').textContent = '';
}

function generateGrid() {
    const gridSize = parseInt(document.getElementById('grid-size').value);

    // Validate input
    if (isNaN(gridSize) || gridSize < 2 || gridSize > 20) {
        document.getElementById('import-error').textContent = 'Grid size must be between 2 and 20.';
        return;
    }

    // Base spacing in mil
    const spacingMil = 125;

    // Get current units selection
    const units = document.getElementById('import-units').value;

    // Convert spacing to mm if mm is selected
    const spacing = units === 'mm' ? convertUnits(spacingMil, 'mil', 'mm') : spacingMil;

    const newPoints = [];

    // Generate grid points
    for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
            const label = `D${row}_${col}`;

            // Position
            const x = col * spacing;
            const y = row * spacing;

            newPoints.push([label, x.toFixed(2), y.toFixed(2)]);
        }
    }

    // Convert to CSV format
    const csv = newPoints.map(p => p.join(',')).join('\n');

    // Update the textarea with the generated CSV
    document.getElementById('import-csv-text').value = csv;

    document.getElementById('import-error').textContent = '';
}

// Save LED appearance settings to localStorage
function saveAppearanceSettings() {
    const ledPackage = document.getElementById('led-package').value;
    const ledColor = document.getElementById('led-color').value;
    const backgroundColor = document.getElementById('background-color').value;

    localStorage.setItem(STORAGE_KEYS.LED_PACKAGE, ledPackage);
    localStorage.setItem(STORAGE_KEYS.LED_COLOR, ledColor);
    localStorage.setItem(STORAGE_KEYS.BACKGROUND_COLOR, backgroundColor);
}

// Function to save the current shader state to localStorage
function saveShaderStateToLocalStorage() {
    try {
        // Create a state object
        const state = serializeState(false); // Don't include data to keep localStorage size reasonable

        // Save to localStorage
        localStorage.setItem(STORAGE_KEYS.SHADER_STATE, JSON.stringify(state));
    } catch (e) {
        console.error('Error saving shader state:', e);
    }
}

// Function to load shader state from localStorage
function loadShaderStateFromLocalStorage() {
    try {
        // Check if there's a state object in localStorage
        const stateJson = localStorage.getItem(STORAGE_KEYS.SHADER_STATE);
        if (!stateJson) return false;

        // Parse and deserialize the state
        const state = JSON.parse(stateJson);
        const result = deserializeState(state);

        return result;
    } catch (e) {
        console.error('Error loading shader state:', e);
        return false;
    }
}

// Load LED appearance settings from localStorage
function loadAppearanceSettings() {
    const ledPackage = localStorage.getItem(STORAGE_KEYS.LED_PACKAGE);
    const ledColor = localStorage.getItem(STORAGE_KEYS.LED_COLOR);
    const backgroundColor = localStorage.getItem(STORAGE_KEYS.BACKGROUND_COLOR);

    if (ledPackage) {
        document.getElementById('led-package').value = ledPackage;
    }

    if (ledColor) {
        document.getElementById('led-color').value = ledColor;
    }

    if (backgroundColor) {
        document.getElementById('background-color').value = backgroundColor;
    }
}

// Modify the existing savePointsToCSV function to use the constant
function savePointsToCSV() {
    const csv = points.map(p => p.join(',')).join('\n');
    localStorage.setItem(STORAGE_KEYS.POINTS_CSV, csv);
}

// #region Shader Definitions

const DEFAULT_SHADER = "radial_rays";

class ParamType {
    constructor(name, defaultValue, jsType, validator) {
        this.name = name;
        this.defaultValue = defaultValue;
        this.jsType = jsType;
        this.validator = validator;
    }
    validate(value) {
        if (this.jsType && typeof value !== this.jsType) return false;
        return this.validator(value);
    }
}

const ParamTypes = Object.freeze({
    NUMBER: new ParamType('NUMBER', 0, 'number', v => typeof v === 'number'),
    INTEGER: new ParamType('INTEGER', 0, 'number', v => Number.isInteger(v)),
    PERCENT: new ParamType('PERCENT', 0, 'number', v => v >= 0 && v <= 1),
    ANGLE: new ParamType('ANGLE', 0, 'number', v => v >= 0 && v <= 2 * Math.PI),
    BOOLEAN: new ParamType('BOOLEAN', 0, 'boolean', value => typeof value === 'boolean'),
    COORDINATE: new ParamType('COORDINATE', { x: 0, y: 0 }, 'object', v =>
        typeof v === 'object' && v !== null && typeof v.x === 'number' && typeof v.y === 'number')
});

class Param {
    constructor(name, paramType, defaultValue, description = null, min = null, max = null, step = null) {
        if (typeof name !== 'string' || !/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name)) {
            throw new Error(
                `Invalid parameter name "${name}". It must be a valid JavaScript identifier (no spaces or special characters).`
            );
        }
        this.name = name;

        // Sanity check that `type` is one of the defined ParamTypes.
        if (!Object.values(ParamTypes).includes(paramType)) {
            throw new Error(`Invalid parameter type "${paramType}" for parameter "${name}".`);
        }

        this.paramType = paramType;

        // default value (get from type)
        if (defaultValue === null) {
            this.defaultValue = paramType.defaultValue;
        } else {
            this.defaultValue = defaultValue;
        }

        this.description = description;  // optional
        this.min = min;
        this.max = max;
        this.step = step;
    }
}

// helper function
const p = function (name, paramType, defaultValue = null, description = null, { min = null, max = null, step = null } = {}) {
    return new Param(name, paramType, defaultValue, description, min, max, step);
};

const globalParams = [
    p('custom_centroid', ParamTypes.COORDINATE, { x: 0, y: 0 },
        "Custom center point for rotation calculations. When set, overrides the natural centroid."),
    p('fixed_offset', ParamTypes.ANGLE, 0,
        "Fixed angle added to every LED (after shader processing).",
        { min: 0, max: 2 * Math.PI, step: Math.PI / 180 }),
    p('counter_rotate', ParamTypes.BOOLEAN, false,
        "Invert rotation direction (multiply final angle by -1)"),
    p('radial_offset', ParamTypes.ANGLE, 0,
        "Angle added to each LED's radial angle (before shader processing).",
        { min: 0, max: 2 * Math.PI, step: Math.PI / 180 }),
    p('quantize', ParamTypes.ANGLE, 0,
        "Round final angle to nearest multiple of this value (0 = no quantization).",
        { min: 0, max: Math.PI / 2, step: Math.PI / 16 })
];

const shaderRegistry = {};
function registerShader(name, description, paramDefs, shaderFn) {
    if (typeof name !== 'string') {
        throw new TypeError("Shader name must be a string.");
    }
    if (name in shaderRegistry) {
        throw new Error(`Shader "${name}" is already registered`);
    }
    if (typeof description !== 'string' && description !== null) {
        throw new TypeError("Shader description must be a string or null.");
    }
    if (!Array.isArray(paramDefs)) {
        throw new TypeError("Shader parameter definitions must be an array.");
    }
    if (typeof shaderFn !== 'function') {
        throw new TypeError("Shader function must be a function.");
    }

    let paramNames = new Set();
    paramDefs.forEach(param => {
        if (!(param instanceof Param)) {
            throw new TypeError("Each parameter definition must be a Param object.");
        }
        if (paramNames.has(param.name)) {
            throw new Error(`Duplicate parameter name "${param.name}" in shader "${name}".`);
        }
        paramNames.add(param.name);
    });

    shaderRegistry[name] = { params: paramDefs, fn: shaderFn, desc: description };
}

// #region Shader Implementations

// Radial Wave: Modulates the radial angle with a sine wave based on radius.
registerShader("radial_wave",
    "Applies a sinusoidal variation to the radial angle based on the distance, creating a wave-like effect.",
    [
        p('frequency', ParamTypes.NUMBER, 1.5,
            "Frequency of the sinusoidal wave along the radius (controls number of cycles per unit distance).",
            { min: 0, max: null, step: 0.1 }),
        p('amplitude', ParamTypes.PERCENT, 0.5,
            "Amplitude of the wave, determining the strength of the angular deviation.")
    ],
    (args, params) =>
        args.radial_angle + Math.sin(args.radius * params.frequency) * params.amplitude
);

registerShader("radial_rays", "Orients LEDs relative to their radial angle from the centroid.",
    [
        p('counter_rotate', ParamTypes.BOOLEAN, false,
            "When enabled, LEDs rotate in the counter-clockwise direction.")
    ],
    (args, params) => args.radial_angle * (params.counter_rotate ? -1 : 1)
);

registerShader(
    "radial_orbit",
    "Orients LEDs perpendicular to the radius, creating a circular flow pattern around the center.",
    [
        p('counter_rotate', ParamTypes.BOOLEAN, false,
            "When enabled, LEDs rotate in the counter-clockwise direction.")
    ],
    (args, params) => (params.counter_rotate ? -1 : 1) * args.radial_angle + Math.PI / 2
);

// Spiral Rotation: Creates a spiral by increasing the rotation with distance.
registerShader(
    "spiral_rotation",
    "Rotates the angle to create a spiral pattern, with the rotation incrementally increasing with radius.",
    [
        p('multiplier', ParamTypes.NUMBER, 0.1,
            "Multiplier that determines how much the angle increases per unit radius, forming the spiral.",
            { min: 0.1, max: null, step: 0.1 })
    ],
    (args, params) => args.radial_angle + args.radius * params.multiplier);


// Chaotic Rotation: Combines sine and cosine modulations for a chaotic effect.
registerShader(
    "chaotic_rotation",
    "Creates a chaotic rotation effect by combining sinusoidal and cosinusoidal modulations of the radial angle.",
    [
        p('radius_factor', ParamTypes.NUMBER, 0.5,
            "Factor controlling the influence of the radial distance on the sine modulation.",
            { min: 0, max: null, step: 0.01 }),
        p('dx_factor', ParamTypes.NUMBER, 0.3,
            "Factor controlling the influence of the horizontal displacement (dx) on the cosine modulation.",
            { min: 0, max: null, step: 0.01 })
    ],
    (args, params) =>
        args.radial_angle +
        Math.sin(args.radius * params.radius_factor) +
        Math.cos(args.dx * params.dx_factor)
);

// Chaotic Attractor: Uses arctan and sine modulations to simulate attractor dynamics.
registerShader(
    "chaotic_attractor",
    "Generates a chaotic attractor effect by combining arctan and sinusoidal modulations based on directional components.",
    [
        p('dy_scale', ParamTypes.NUMBER, 1.3,
            "Scaling factor for the vertical component (dy) in the arctan calculation.",
            { min: 0, max: null, step: 0.1 }),
        p('dx_scale', ParamTypes.NUMBER, 0.7,
            "Scaling factor for the horizontal component (dx) in the arctan calculation.",
            { min: 0, max: null, step: 0.1 }),
        p('product_factor', ParamTypes.NUMBER, 0.05,
            "Factor that scales the product of dx and dy for the sinusoidal modulation.",
            { min: 0, max: null, step: 0.01 })
    ],
    (args, params) =>
        Math.atan2(args.dy * params.dy_scale, args.dx * params.dx_scale) +
        Math.sin(args.dx * args.dy * params.product_factor)
);

// Pulsar Rotation: Alternates the rotation angle in a pulsing manner.
registerShader(
    "pulsar_rotation",
    "Generates a pulsating rotational effect where the angle alternates based on a pulse count, scaling, and phase shift.",
    [
        p('pulse_count', ParamTypes.INTEGER, 6,
            "Number of pulses defining how many alternations occur as radius increases.",
            { min: 1, max: null, step: 1 }),
        p('scaling', ParamTypes.NUMBER, 1.0,
            "Scaling factor that determines the radial distance at which pulses occur.",
            { min: 0, max: null, step: 0.1 }),
        p('phase_shift', ParamTypes.ANGLE, Math.PI / 2,
            "Fixed angular offset applied when a pulse occurs, shifting the rotation.",
            { min: 0, max: 2 * Math.PI, step: Math.PI / 180 }),
        p('counter_rotate', ParamTypes.BOOLEAN, false, "When enabled, LEDs rotate in the counter-clockwise direction.")
    ],
    (args, params) => {
        const pulse = Math.floor(args.radius * params.pulse_count / params.scaling);
        return (params.counter_rotate ? -1 : 1) * args.radial_angle + (pulse % 2) * params.phase_shift;
    });

registerShader(
    "concentric_zones",
    "Creates two distinct zones of LED orientation with an optional smooth transition between them.",
    [
        p('core_angle', ParamTypes.ANGLE, 0,
            "Orientation angle for LEDs in the inner zone.",
            { min: 0, max: Math.PI, step: Math.PI / 180 }),
        p('outer_angle', ParamTypes.ANGLE, Math.PI / 2,
            "Orientation angle for LEDs in the outer zone.",
            { min: 0, max: Math.PI, step: Math.PI / 180 }),
        p('boundary_radius', ParamTypes.PERCENT, 0.5,
            "Location of the boundary between inner and outer zones (as % of max radius).",
            { min: 0, max: 1, step: 0.05 }),
        p('blend_width', ParamTypes.PERCENT, 0.1,
            "Width of the transition band between zones (0 creates a sharp boundary).",
            { min: 0, max: 1, step: 0.01 })
    ],
    (args, params) => {
        // If blend_width is 0 or very small, use a hard threshold
        if (params.blend_width < 0.001) {
            return args.radius <= params.boundary_radius ? params.core_angle : params.outer_angle;
        }

        // Calculate the crossfade boundaries
        const lowerBound = Math.max(0, params.boundary_radius - params.blend_width / 2);
        const upperBound = Math.min(1, params.boundary_radius + params.blend_width / 2);

        if (args.radius <= lowerBound) {
            // Inside the inner region
            return params.core_angle;
        } else if (args.radius >= upperBound) {
            // Outside the outer region
            return params.outer_angle;
        } else {
            // In the transition zone, interpolate between the two angles
            const t = (args.radius - lowerBound) / (upperBound - lowerBound);

            // Linear interpolation between the two angles
            // We need to handle the case where the angles cross the 0/2π boundary
            const diff = params.outer_angle - params.core_angle;
            const shortestDiff = Math.abs(diff) <= Math.PI ? diff : diff - Math.sign(diff) * 2 * Math.PI;

            return params.core_angle + t * shortestDiff;
        }
    }
);

// Ripple Shader: Creates concentric rings that alternate between two angles
registerShader(
    "ripple",
    "Creates concentric ripples that alternate between two angles as radius increases, with controllable frequency.",
    [
        p('peak_angle', ParamTypes.ANGLE, 0,
            "Angle assigned to LEDs at the peak of each ripple wave.",
            { min: 0, max: Math.PI, step: Math.PI / 180 }),
        p('trough_angle', ParamTypes.ANGLE, Math.PI / 2,
            "Angle assigned to LEDs at the trough of each ripple wave.",
            { min: 0, max: Math.PI, step: Math.PI / 180 }),
        p('frequency', ParamTypes.NUMBER, 1,
            "Number of complete ripples that occur between center and maximum radius.",
            { min: 0.25, max: 3, step: 0.25 }),
        p('phase_shift', ParamTypes.PERCENT, 0,
            "Shifts the ripple pattern radially.",
            { min: 0, max: 1, step: 0.05 }),
        p('sharpness', ParamTypes.NUMBER, 1,
            "Controls how sharp the transition between angles is (higher = more abrupt).",
            { min: 0.1, max: 10, step: 0.1 })
    ],
    (args, params) => {
        // Calculate the ripple wave using sine function
        // The sine wave output ranges from -1 to 1
        const wave = Math.sin(
            2 * Math.PI * params.frequency * args.radius +
            2 * Math.PI * params.phase_shift
        );

        // Apply sharpness by raising sine to an odd power to maintain -1 to 1 range
        // but make transitions sharper between peaks and troughs
        let sharpWave = wave;
        if (params.sharpness > 1) {
            // Using Math.pow with odd exponent preserves the sign
            sharpWave = Math.pow(Math.abs(wave), 1 / params.sharpness) * Math.sign(wave);
        }

        // Map the wave value (-1 to 1) to a blend factor (0 to 1)
        const blendFactor = (sharpWave + 1) / 2;

        // Linear interpolation between trough_angle and peak_angle
        // Handle the case where angles cross the 0/2π boundary
        const diff = params.peak_angle - params.trough_angle;
        const shortestDiff = Math.abs(diff) <= Math.PI ? diff : diff - Math.sign(diff) * 2 * Math.PI;

        return params.trough_angle + blendFactor * shortestDiff;
    }
);

// Lateral Wave Shader: Creates parallel bands that alternate between two angles
registerShader(
    "lateral_wave",
    "Creates parallel bands of alternating angles along a specified direction.",
    [
        p('peak_angle', ParamTypes.ANGLE, 0,
            "Angle assigned to LEDs at the peak of each wave.",
            { min: 0, max: Math.PI, step: Math.PI / 180 }),
        p('trough_angle', ParamTypes.ANGLE, Math.PI / 2,
            "Angle assigned to LEDs at the trough of each wave.",
            { min: 0, max: Math.PI, step: Math.PI / 180 }),
        p('wave_direction', ParamTypes.ANGLE, Math.PI / 4,
            "Direction along which the waves propagate.",
            { min: 0, max: Math.PI, step: Math.PI / 180 }),
        p('frequency', ParamTypes.NUMBER, 1,
            "Number of complete waves that occur across the unit space.",
            { min: 0.25, max: 10, step: 0.25 }),
        p('phase_shift', ParamTypes.PERCENT, 0,
            "Shifts the wave pattern.",
            { min: 0, max: 1, step: 0.05 }),
        p('sharpness', ParamTypes.NUMBER, 1,
            "Controls how sharp the transition between angles is (higher = more abrupt).",
            { min: 0.1, max: 10, step: 0.1 })
    ],
    (args, params) => {
        // Calculate the projection of the point onto the wave direction vector
        // Wave direction is the direction along which the waves propagate
        const directionX = Math.cos(params.wave_direction);
        const directionY = Math.sin(params.wave_direction);

        // Project the point's position onto the direction vector
        // This gives us the distance along the wave direction
        const projectedDistance = args.dx * directionX + args.dy * directionY;

        // Calculate the wave using sine function
        // The sine wave output ranges from -1 to 1
        const wave = Math.sin(
            2 * Math.PI * params.frequency * projectedDistance +
            2 * Math.PI * params.phase_shift
        );

        // Apply sharpness by raising sine to an odd power to maintain -1 to 1 range
        // but make transitions sharper between peaks and troughs
        let sharpWave = wave;
        if (params.sharpness > 1) {
            // Using Math.pow with odd exponent preserves the sign
            sharpWave = Math.pow(Math.abs(wave), 1 / params.sharpness) * Math.sign(wave);
        }

        // Map the wave value (-1 to 1) to a blend factor (0 to 1)
        const blendFactor = (sharpWave + 1) / 2;

        // Linear interpolation between trough_angle and peak_angle
        // Handle the case where angles cross the 0/2π boundary
        const diff = params.peak_angle - params.trough_angle;
        const shortestDiff = Math.abs(diff) <= Math.PI ? diff : diff - Math.sign(diff) * 2 * Math.PI;

        return params.trough_angle + blendFactor * shortestDiff;
    }
);

// Fibonacci Rotation: Applies the golden angle to create a Fibonacci spiral.
registerShader(
    "fibonacci_rotation",
    "Uses the golden angle to rotate points, creating a Fibonacci spiral distribution.",
    [],
    (args) => {
        const golden_angle = Math.PI * (3 - Math.sqrt(5));
        return args.radial_angle + golden_angle * args.radius;
    });

// Lissajous Rotation: Generates a Lissajous curve–inspired pattern.
registerShader(
    "lissajous_rotation",
    "Applies a Lissajous curve-inspired rotation by combining different frequencies and a phase offset.",
    [
        p('freq_x', ParamTypes.NUMBER, 3,
            "Frequency factor affecting the modulation of the horizontal (x) component.",
            { min: 0, max: null, step: 0.1 }),
        p('freq_y', ParamTypes.NUMBER, 2,
            "Frequency factor affecting the modulation of the vertical (y) component.",
            { min: 0, max: null, step: 0.1 }),
        p('phase_offset', ParamTypes.NUMBER, Math.PI / 4,
            "Constant phase offset added to the computed Lissajous pattern.",
            { min: 0, max: 2 * Math.PI, step: Math.PI / 180 })
    ],
    (args, params) => {
        const phase = Math.atan2(
            Math.sin(args.dy * params.freq_y),
            Math.cos(args.dx * params.freq_x)
        );
        return phase + params.phase_offset;
    });

registerShader("polar_gradient", "Creates a gradient rotation pattern by blending radial angle with distance-based effects.",
    [
        p('angular_offset', ParamTypes.ANGLE, 0, "Fixed angular offset applied to all LEDs.",
            { min: 0, max: Math.PI, step: Math.PI / 180 }),
        p('radial_intensity', ParamTypes.PERCENT, 0, "How strongly distance from center influences rotation angle."),
        p('center_weighted', ParamTypes.BOOLEAN, false, "When enabled, LEDs closer to center receive stronger effect."),
        p('counter_rotate', ParamTypes.BOOLEAN, false, "When enabled, LEDs rotate in the counter-clockwise direction.")
    ],
    (args, params) =>
        (params.counter_rotate ? -1 : 1) * args.radial_angle + params.angular_offset + (2 * Math.PI * (params.center_weighted ? 1 - args.radius : args.radius) * params.radial_intensity)
);

// Flower Pattern: Creates a petal-like pattern using sinusoidal modulation.
registerShader(
    "flower",
    "Generates a flower-like pattern by modulating the radial angle with a sinusoidal function.",
    [
        p('petals', ParamTypes.INTEGER, 5,
            "Number of petals (controls the frequency of the sinusoidal pattern creating petal shapes).",
            { min: 1, max: null, step: 1 }),
        p('intensity', ParamTypes.PERCENT, 0.3,
            "Intensity of the petal effect, determining how strongly the angle is modulated.")
    ], (args, params) =>
    args.radial_angle + Math.sin(args.radial_angle * params.petals) * params.intensity
);

// Pinwheel Shader: Creates a flower-like rotation pattern with a radial offset.
registerShader(
    "pinwheel",
    "Generates a flower-like pattern by modulating the radial angle with a sinusoidal function of the petal count and intensity.",
    [
        p('strength', ParamTypes.NUMBER, 0.2,
            "Rotation strength that scales the effect of the radius on the angle, forming the pinwheel.",
            { min: 0, max: null, step: 0.1 }),
        p('offset', ParamTypes.ANGLE, Math.PI / 4,
            "Angular offset that shifts the base orientation of the pinwheel pattern.",
            { min: 0, max: 2 * Math.PI, step: Math.PI / 180 })
    ],
    (args, params) =>
        args.radial_angle + params.strength * args.radius + params.offset
);

// Fixed Angle: Uses a constant angle regardless of input.
registerShader("fixed", "Fixed angle.",
    [
        p('angle', ParamTypes.ANGLE, Math.PI / 2,
            "The fixed angle value that overrides any computed rotation.",
            { min: 0, max: 2 * Math.PI, step: Math.PI / 180 })
    ],
    (args, params) =>
        params.angle
);

// Quantum Spin: Quantizes the angle into discrete steps to simulate quantum spin.
registerShader(
    "quantum_spin",
    "Quantizes the rotation into discrete spin states, simulating a quantum spin effect.",
    [
        p('spin_states', ParamTypes.INTEGER, 8,
            "Number of discrete spin states; higher values yield finer angular quantization.",
            { min: 2, max: 16, step: 1 })
    ], (args, params) => {

        // special case 2 states to quantize to 90° because otherwise they're 180° apart
        if (params.spin_states === 2) {
            return Math.round(args.radial_angle * 2 / (2 * Math.PI)) * (Math.PI / 2);
        }

        const quantized = Math.round(args.radial_angle * params.spin_states / (2 * Math.PI)) *
            (2 * Math.PI / params.spin_states);
        return quantized + Math.PI / params.spin_states;
    });

// Magnetic Dipole: Simulates a magnetic dipole field using vector calculations.
registerShader(
    "magnetic_dipole",
    "Simulates the magnetic dipole field by computing a field vector and returning its angle, creating complex rotational patterns.",
    [
        p('t', ParamTypes.ANGLE, 0,
            "Angle representing the orientation of the dipole's magnetic moment."),
        p('scale', ParamTypes.NUMBER, 3,
            "Scaling factor that adjusts the overall strength of the dipole field simulation.",
            { min: 0, max: null, step: 0.1 }),
        p('exponent1', ParamTypes.NUMBER, 2.5,
            "Exponent controlling the falloff rate of the dipole field's directional component.",
            { min: 0, max: null, step: 0.1 }),
        p('exponent2', ParamTypes.NUMBER, 1.5,
            "Exponent controlling the falloff rate of the dipole field's direct contribution.",
            { min: 0, max: null, step: 0.1 })
    ],
    (args, params) => {
        const m_x = Math.cos(params.t);
        const m_y = Math.sin(params.t);
        const r_sq = args.dx ** 2 + args.dy ** 2;
        const Bx = params.scale * args.dx * (m_x * args.dx + m_y * args.dy) /
            r_sq ** params.exponent1 - m_x / r_sq ** params.exponent2;
        const By = params.scale * args.dy * (m_x * args.dx + m_y * args.dy) /
            r_sq ** params.exponent1 - m_y / r_sq ** params.exponent2;
        return Math.atan2(By, Bx);
    });

// Random
registerShader(
    "random", "Completely random", [], (args, params) => Math.random() * 2 * Math.PI);

registerShader(
    "vortex",
    "Creates a swirling vortex effect with intensity increasing toward the center.",
    [
        p('intensity', ParamTypes.NUMBER, 0.2,
            "Controls how strong the vortex effect becomes at the center.",
            { min: 0.1, max: 10, step: 0.1 }),
        p('falloff', ParamTypes.NUMBER, 1.5,
            "Determines how quickly the effect diminishes with distance.",
            { min: 0.1, max: 5, step: 0.1 })
    ],
    (args, params) =>
        args.radial_angle + (params.intensity / (args.radius ** params.falloff + 0.01))
);

registerShader(
    "moire_pattern",
    "Generates moiré interference patterns by combining multiple circular patterns.",
    [
        p('frequency1', ParamTypes.NUMBER, 10,
            "Frequency of the first circular pattern.",
            { min: 1, max: 50, step: 0.5 }),
        p('frequency2', ParamTypes.NUMBER, 11,
            "Frequency of the second circular pattern.",
            { min: 1, max: 50, step: 0.5 }),
        p('amplitude', ParamTypes.NUMBER, 0.3,
            "Strength of the interference pattern effect.",
            { min: 0, max: 1, step: 0.05 })
    ],
    (args, params) =>
        args.radial_angle + params.amplitude * (
            Math.sin(args.radius * params.frequency1) *
            Math.sin(args.radius * params.frequency2)
        )
);

registerShader(
    "fractal_noise",
    "Creates organic, fractal-like patterns using noise functions.",
    [
        p('scale', ParamTypes.NUMBER, 3.0,
            "Scale of the noise pattern.",
            { min: 0.1, max: 10, step: 0.1 }),
        p('octaves', ParamTypes.INTEGER, 3,
            "Number of noise layers to combine.",
            { min: 1, max: 8, step: 1 }),
        p('persistence', ParamTypes.NUMBER, 0.5,
            "How much each octave contributes to the final result.",
            { min: 0.1, max: 0.9, step: 0.05 })
    ],
    (args, params) => {
        // Simple pseudo-noise implementation
        let value = 0;
        let amplitude = 1;
        let frequency = 1;
        let maxValue = 0;

        for (let i = 0; i < params.octaves; i++) {
            // Create noise-like values using sine functions at different frequencies
            const nx = Math.sin(args.dx * frequency * params.scale + args.dy * 0.7);
            const ny = Math.sin(args.dy * frequency * params.scale + args.dx * 0.7);
            value += amplitude * (nx * ny);

            maxValue += amplitude;
            amplitude *= params.persistence;
            frequency *= 2;
        }

        // Normalize and convert to angle
        const normalized = (value / maxValue + 1) / 2;
        return normalized * 2 * Math.PI;
    }
);

registerShader(
    "logarithmic_spiral",
    "Generates a logarithmic spiral pattern with controllable tightness.",
    [
        p('growth_rate', ParamTypes.NUMBER, 0.2,
            "Controls how tightly the spiral winds (larger values create tighter spirals).",
            { min: 0.1, max: 8, step: 0.1 }),
        p('counter_rotate', ParamTypes.BOOLEAN, false, "When enabled, LEDs rotate in the counter-clockwise direction.")
    ],
    (args, params) =>
        (params.counter_rotate ? -1 : 1) * args.radial_angle + params.growth_rate * Math.log(args.radius + 1)
);

registerShader(
    "wave_interference",
    "Simulates the interference pattern of multiple waves emanating from different points.",
    [
        p('source1', ParamTypes.COORDINATE, { x: 0.3, y: 0.3 },
            "Position of the first wave source (-1 to 1).",
            { min: -1, max: 1, step: 0.05 }),
        p('source2', ParamTypes.COORDINATE, { x: -0.3, y: -0.3 },
            "Position of the second wave source (-1 to 1).",
            { min: -1, max: 1, step: 0.05 }),
        p('frequency', ParamTypes.NUMBER, 2,
            "Wave frequency parameter.",
            { min: 1, max: 30, step: 0.5 })
    ],
    (args, params) => {
        // Calculate distances from wave sources
        const dist1 = Math.sqrt(
            Math.pow(args.dx - params.source1.x, 2) +
            Math.pow(args.dy - params.source1.y, 2)
        );
        const dist2 = Math.sqrt(
            Math.pow(args.dx - params.source2.x, 2) +
            Math.pow(args.dy - params.source2.y, 2)
        );

        // Calculate wave phase based on distances
        const phase = Math.sin(dist1 * params.frequency) + Math.sin(dist2 * params.frequency);
        return args.radial_angle + phase;
    }
);

registerShader(
    "turbulence",
    "Simulates turbulent fluid-like flows with swirling patterns.",
    [
        p('scale', ParamTypes.NUMBER, 0.01,
            "Scale of the turbulence pattern.",
            { min: 0.001, max: 0.1, step: 0.001 }),
        p('strength', ParamTypes.NUMBER, 2.0,
            "Strength of the turbulence effect.",
            { min: 0.1, max: 5, step: 0.1 })
    ],
    (args, params) => {
        // Create pseudo-turbulence using sine functions at different scales
        const noise1 = Math.sin(args.dx * params.scale * 1.7) * Math.cos(args.dy * params.scale * 2.3);
        const noise2 = Math.sin(args.dx * params.scale * 3.7 + 0.5) * Math.cos(args.dy * params.scale * 1.9 + 0.4);
        const noise3 = Math.sin(args.dx * params.scale * 5.1 + 1.1) * Math.cos(args.dy * params.scale * 4.3 + 1.3);

        const turbulence = (noise1 + noise2 * 0.5 + noise3 * 0.25) * params.strength;
        return args.radial_angle + turbulence;
    }
);

registerShader(
    "electric_field",
    "Simulates an electric field with multiple point charges.",
    [
        p('charge1', ParamTypes.COORDINATE, { x: 0.3, y: 0.3 },
            "Position of the first charge (-1 to 1).",
            { min: -1, max: 1, step: 0.05 }),
        p('charge1_value', ParamTypes.NUMBER, 1,
            "Value of the first charge (positive or negative).",
            { min: -3, max: 3, step: 0.1 }),
        p('charge2', ParamTypes.COORDINATE, { x: -0.3, y: -0.3 },
            "Position of the second charge (-1 to 1).",
            { min: -1, max: 1, step: 0.05 }),
        p('charge2_value', ParamTypes.NUMBER, -1,
            "Value of the second charge (positive or negative).",
            { min: -3, max: 3, step: 0.1 })
    ],
    (args, params) => {
        // Convert normalized coordinates to actual positions
        const c1x = params.charge1.x;
        const c1y = params.charge1.y;
        const c2x = params.charge2.x;
        const c2y = params.charge2.y;

        // Calculate vector components from each charge
        const r1sq = Math.pow(args.dx - c1x, 2) + Math.pow(args.dy - c1y, 2) + 0.01;
        const r2sq = Math.pow(args.dx - c2x, 2) + Math.pow(args.dy - c2y, 2) + 0.01;

        // Calculate field components
        const Ex = params.charge1_value * (args.dx - c1x) / (r1sq * Math.sqrt(r1sq)) +
            params.charge2_value * (args.dx - c2x) / (r2sq * Math.sqrt(r2sq));
        const Ey = params.charge1_value * (args.dy - c1y) / (r1sq * Math.sqrt(r1sq)) +
            params.charge2_value * (args.dy - c2y) / (r2sq * Math.sqrt(r2sq));

        // Return the angle of the field vector
        return Math.atan2(Ey, Ex);
    }
);

registerShader(
    "hyperbolic_field",
    "Generates a hyperbolic field pattern with controllable curvature.",
    [
        p('curvature', ParamTypes.NUMBER, 0.5,
            "Controls the curvature of the hyperbolic field.",
            { min: 0.1, max: 3, step: 0.1 })
    ],
    (args, params) => {
        const x_ratio = args.dx;
        const y_ratio = args.dy;
        return Math.atan2(
            2 * x_ratio * y_ratio,
            params.curvature * (x_ratio * x_ratio - y_ratio * y_ratio)
        );
    }
);

registerShader(
    "gradient_field",
    "Generates a gradient field where the angle changes smoothly based on the position.",
    [
        p('gradient_x', ParamTypes.NUMBER, 1.0,
            "Gradient in the x-direction.",
            { min: -10, max: 10, step: 0.1 }),
        p('gradient_y', ParamTypes.NUMBER, 1.0,
            "Gradient in the y-direction.",
            { min: -10, max: 10, step: 0.1 })
    ],
    (args, params) => Math.atan2(args.dy * params.gradient_y, args.dx * params.gradient_x)
);

registerShader(
    "wormhole_twist",
    "Combines a logarithmic spiral with a sinusoidal twist, simulating a wormhole-like distortion.",
    [
        p('growth_rate', ParamTypes.NUMBER, 0.2,
            "Controls the tightness of the spiral twist.",
            { min: 0.1, max: 10, step: 0.1 }),
        p('twist_amplitude', ParamTypes.PERCENT, 0.5,
            "Amplitude of the sinusoidal twist effect."),
        p('twist_frequency', ParamTypes.NUMBER, 5,
            "Frequency of the twist oscillation.",
            { min: 0.1, max: null, step: 0.5 })
    ],
    (args, params) => {
        const spiral = params.growth_rate * Math.log(args.radius + 1);
        const twist = params.twist_amplitude * Math.sin(params.twist_frequency * args.radius);
        return args.radial_angle + spiral + twist;
    }
);

registerShader(
    "kaleidoscopic_reflection",
    "Divides the circle into sectors and reflects the angle into one mirror segment for a kaleidoscopic effect.",
    [
        p('sectors', ParamTypes.INTEGER, 6,
            "Number of mirror sectors.",
            { min: 2, max: null, step: 1 }),
        p('offset', ParamTypes.ANGLE, 0,
            "Angular offset to rotate the sectors.",
            { min: 0, max: 2 * Math.PI, step: Math.PI / 180 })
    ],
    (args, params) => {
        const sectorAngle = 2 * Math.PI / params.sectors;
        // Adjust the angle by the offset and normalize into [0, 2π)
        let adjusted = (args.radial_angle - params.offset) % (2 * Math.PI);
        if (adjusted < 0) adjusted += 2 * Math.PI;
        // Map the adjusted angle into the current sector
        let local = adjusted % sectorAngle;
        // Reflect the angle if it is in the second half of the sector
        if (local > sectorAngle / 2) local = sectorAngle - local;
        return local + params.offset;
    }
);

registerShader(
    "perlin_rotation",
    "Uses Perlin-like noise to create organic angular variations.",
    [
        p('scale', ParamTypes.NUMBER, 2.0,
            "Scale of the noise pattern.",
            { min: 0.1, max: 10, step: 0.1 }),
        p('amplitude', ParamTypes.NUMBER, 1.5,
            "Amplitude of the angular variation.",
            { min: 0, max: 3, step: 0.1 })
    ],
    (args, params) => {
        // Simple Perlin-like noise using multiple sine waves at different frequencies
        const noise =
            Math.sin(args.dx * params.scale + args.dy * 1.3) * 0.5 +
            Math.sin(args.dx * params.scale * 2.1 + args.dy * 0.9) * 0.25 +
            Math.sin(args.dx * 0.7 + args.dy * params.scale * 1.7) * 0.125 +
            Math.sin(args.dx * 2.3 + args.dy * params.scale * 2.9) * 0.0625;

        return args.radial_angle + noise * params.amplitude;
    }
);

registerShader(
    "quadrant_director",
    "Assigns different angles to each quadrant, with tiebreaker rules.",
    [
        p('offset', ParamTypes.ANGLE, 0,
            "Angular offset applied to all quadrants.",
            { min: 0, max: Math.PI, step: Math.PI / 4 }),
        p('border_width', ParamTypes.PERCENT, 0.05,
            "Width of the border regions along the axes.",
            { min: 0.01, max: 0.33, step: 0.01 }),
        p('average_border_angles', ParamTypes.BOOLEAN, false,
            "When enabled, border regions use the average angle of adjacent quadrants.")
    ],
    (args, params) => {
        // Create a small border zone along each axis
        const borderWidth = params.border_width;

        // Check which region the point falls into
        const inXBorder = Math.abs(args.dx) <= borderWidth;
        const inYBorder = Math.abs(args.dy) <= borderWidth;
        const x_positive = args.dx > borderWidth;
        const x_negative = args.dx < -borderWidth;
        const y_positive = args.dy > borderWidth;
        const y_negative = args.dy < -borderWidth;

        // Define quadrant angles (with offset)
        const topRightAngle = params.offset;                    // 0°
        const topLeftAngle = Math.PI / 2 + params.offset;       // 90°
        const bottomLeftAngle = Math.PI + params.offset;        // 180°
        const bottomRightAngle = 3 * Math.PI / 2 + params.offset; // 270°

        // Helper function to compute average angle between two angles
        const averageAngles = (...angles) => {
            let sinSum = 0, cosSum = 0;
            for (const angle of angles) {
                sinSum += Math.sin(angle);
                cosSum += Math.cos(angle);
            }
            const avgAngle = Math.atan2(sinSum, cosSum);
            return avgAngle < 0 ? avgAngle + 2 * Math.PI : avgAngle;
        };

        // Center region (where both axes cross)
        if (inXBorder && inYBorder) {
            // never average, because it's meaningless in this case
            return Math.PI / 4 + params.offset; // 45° + offset
        }

        // X-axis regions
        if (inXBorder) {
            if (y_positive) {
                if (params.average_border_angles) {
                    // Average of top-left and top-right
                    return averageAngles(topLeftAngle, topRightAngle);
                } else {
                    return topRightAngle; // 0° + offset (right)
                }
            }
            if (y_negative) {
                if (params.average_border_angles) {
                    // Average of bottom-left and bottom-right
                    return averageAngles(bottomLeftAngle, bottomRightAngle);
                } else {
                    return bottomLeftAngle; // 180° + offset (left)
                }
            }
        }

        // Y-axis regions
        if (inYBorder) {
            if (x_positive) {
                if (params.average_border_angles) {
                    // Average of top-right and bottom-right
                    return averageAngles(topRightAngle, bottomRightAngle);
                } else {
                    return topLeftAngle; // 90° + offset (up)
                }
            }
            if (x_negative) {
                if (params.average_border_angles) {
                    // Average of top-left and bottom-left
                    return averageAngles(topLeftAngle, bottomLeftAngle);
                } else {
                    return bottomRightAngle; // 270° + offset (down)
                }
            }
        }

        // Quadrant regions (outside border zones)
        if (x_positive && y_positive) return topRightAngle;    // Top right: 0° (right)
        if (x_negative && y_positive) return topLeftAngle;     // Top left: 90° (up)
        if (x_negative && y_negative) return bottomLeftAngle;  // Bottom left: 180° (left)
        if (x_positive && y_negative) return bottomRightAngle; // Bottom right: 270° (down)

        // Should never reach here, but just in case
        return params.offset;
    }
);

registerShader(
    "binary_grid",
    "Creates a simple binary checkerboard pattern.",
    [
        p('grid_size', ParamTypes.INTEGER, 2,
            "Size of the grid cells.",
            { min: 1, max: 10, step: 1 }),
        p('angle1', ParamTypes.ANGLE, 0,
            "Angle for the first grid cells.",
            { min: 0, max: Math.PI, step: Math.PI / 8 }),
        p('angle2', ParamTypes.ANGLE, Math.PI / 2,
            "Angle for the second grid cells.",
            { min: 0, max: Math.PI, step: Math.PI / 8 })
    ],
    (args, params) => {
        // Create a grid based on integer coordinates
        const gridX = Math.floor(args.dx * params.grid_size + 100) % 2; // +100 to handle negative coordinates
        const gridY = Math.floor(args.dy * params.grid_size + 100) % 2;

        // Use XOR to create a checkerboard pattern
        return (gridX ^ gridY) ? params.angle1 : params.angle2;
    }
);

registerShader(
    "pixel_sector",
    "Divides the space into discrete sectors.",
    [
        p('sectors', ParamTypes.INTEGER, 4,
            "Number of angular sectors to divide the space into.",
            { min: 2, max: 16, step: 1 }),
        p('offset', ParamTypes.ANGLE, 0,
            "Angular offset for the sectors.",
            { min: 0, max: Math.PI, step: Math.PI / 8 })
    ],
    (args, params) => {
        // Quantize the angle to a discrete sector
        const sectorSize = 2 * Math.PI / params.sectors;
        const sectorIndex = Math.floor((args.radial_angle + params.offset) / sectorSize);
        // Return the center angle of the sector
        if (params.sectors == 2) {
            // if two sectors, would otherwise map to 0 & 180°, which looks identical.
            return sectorIndex * sectorSize / 2 + sectorSize / 2;
        } else {
            return sectorIndex * sectorSize + sectorSize / 2;
        }
    }
);

registerShader(
    "macro_pixel",
    "Groups pixels into larger 'macro pixels' with consistent angles.",
    [
        p('pixel_size', ParamTypes.INTEGER, 4,
            "Size of each macro pixel (higher = fewer distinct regions).",
            { min: 2, max: 10, step: 1 }),
        p('angle_count', ParamTypes.INTEGER, 4,
            "Number of distinct angles to use.",
            { min: 2, max: 8, step: 1 })
    ],
    (args, params) => {
        // Group coordinates into larger pixels
        const macroX = Math.floor(args.dx * params.pixel_size);
        const macroY = Math.floor(args.dy * params.pixel_size);

        // Create a deterministic but seemingly random angle for each macro pixel
        const pixelValue = ((macroX * 7919) ^ (macroY * 104729)) % params.angle_count;

        // Map to evenly distributed angles
        // use 180° range
        return (pixelValue * (Math.PI / params.angle_count));
    }
);

registerShader(
    "harmonic_resonance",
    "Layers two sine waves at different frequencies and phases to produce a resonant modulation of the angle.",
    [
        p('amplitude1', ParamTypes.PERCENT, 0.3,
            "Amplitude of the first harmonic."),
        p('frequency1', ParamTypes.NUMBER, 3,
            "Frequency of the first harmonic.",
            { min: 0.1, max: null, step: 0.1 }),
        p('phase1', ParamTypes.ANGLE, 0,
            "Phase offset of the first harmonic.",
            { min: 0, max: 2 * Math.PI, step: Math.PI / 180 }),
        p('amplitude2', ParamTypes.PERCENT, 0.2,
            "Amplitude of the second harmonic."),
        p('frequency2', ParamTypes.NUMBER, 5,
            "Frequency of the second harmonic.",
            { min: 0.1, max: null, step: 0.1 }),
        p('phase2', ParamTypes.ANGLE, Math.PI / 4,
            "Phase offset of the second harmonic.",
            { min: 0, max: 2 * Math.PI, step: Math.PI / 180 })
    ],
    (args, params) => {
        const harmonic1 = params.amplitude1 * Math.sin(params.frequency1 * args.radius + params.phase1);
        const harmonic2 = params.amplitude2 * Math.sin(params.frequency2 * args.radius + params.phase2);
        return args.radial_angle + harmonic1 + harmonic2;
    }
);

registerShader(
    "spiral_galaxy",
    "Simulates a spiral galaxy with arms that rotate around the center.",
    [
        p('arm_count', ParamTypes.INTEGER, 3,
            "Number of spiral arms.",
            { min: 1, max: 10, step: 1 }),
        p('arm_tightness', ParamTypes.NUMBER, 0.2,
            "Controls how tightly the arms are wound.",
            { min: 0.1, max: 1, step: 0.1 })
    ],
    (args, params) => {
        const angle_per_arm = (2 * Math.PI) / params.arm_count;
        const arm = Math.floor(args.radial_angle / angle_per_arm);
        return args.radial_angle + arm * angle_per_arm + args.radius * params.arm_tightness;
    }
);

registerShader(
    "radial_symmetry",
    "Creates a radially symmetric pattern where the angle is repeated at regular intervals.",
    [
        p('symmetry_count', ParamTypes.INTEGER, 6,
            "Number of symmetric sections.",
            { min: 1, max: 12, step: 1 })
    ],
    (args, params) => args.radial_angle % (2 * Math.PI / params.symmetry_count)
);


// Vector Field Flow Shader
registerShader(
    "vector_field_flow",
    "Simulates fluid dynamics with rotating vector fields.",
    [
        p('flow_speed', ParamTypes.NUMBER, 2.0,
            "Speed of the vector field flow (affects time-like distortion).",
            { min: 0.1, max: 10, step: 0.1 }),
        p('vortex_strength', ParamTypes.NUMBER, 0.5,
            "Strength of vorticity in the flow.",
            { min: 0, max: 1, step: 0.05 }),
        p('divergence', ParamTypes.NUMBER, 0.3,
            "Amount of divergence/convergence in the field.",
            { min: -1, max: 1, step: 0.05 }),
        p('vortex_count', ParamTypes.INTEGER, 2,
            "Number of vortices in the field.",
            { min: 1, max: 5, step: 1 })
    ],
    (args, params) => {
        // Create a vector field with multiple vortices
        let vx = 0;
        let vy = 0;

        // We'll use flow_speed to offset the vortex positions - simulating movement
        // This creates an effect where increasing flow_speed changes the pattern
        const timeOffset = params.flow_speed * 0.2;

        // Create multiple vortices
        for (let i = 0; i < params.vortex_count; i++) {
            // Position each vortex at different locations
            const angle = (i * Math.PI * 2 / params.vortex_count) + timeOffset;
            const distance = 0.4; // Distance from center

            const vortexX = Math.cos(angle) * distance;
            const vortexY = Math.sin(angle) * distance;

            // Calculate distance from this point to the vortex
            const dx = args.dx - vortexX;
            const dy = args.dy - vortexY;
            const distSquared = dx * dx + dy * dy + 0.01; // Add small value to avoid division by zero

            // Vortex effect is stronger when closer to the vortex
            const strength = params.vortex_strength / distSquared;

            // Add rotational component from this vortex (perpendicular to radius)
            vx += -dy * strength;
            vy += dx * strength;

            // Add divergent/convergent component
            vx += dx * params.divergence * strength;
            vy += dy * params.divergence * strength;
        }

        // Add a base flow direction that changes with flow_speed
        vx += Math.cos(timeOffset * 3) * 0.2;
        vy += Math.sin(timeOffset * 2) * 0.2;

        // Return the angle of the resulting vector
        return Math.atan2(vy, vx);
    }
);

// Crystal Structure Shader
registerShader(
    "crystal_structure",
    "Creates patterns inspired by crystallography lattice structures.",
    [
        p('lattice_type', ParamTypes.INTEGER, 0,
            "Crystal lattice type (0=Cubic, 1=Hexagonal, 2=Tetragonal, 3=Diamond).",
            { min: 0, max: 3, step: 1 }),
        p('unit_cell_size', ParamTypes.NUMBER, 0.15,
            "Size of the unit cell in the crystal lattice.",
            { min: 0.05, max: 0.5, step: 0.01 }),
        p('orientation', ParamTypes.ANGLE, 0,
            "Orientation of the crystal lattice.",
            { min: 0, max: Math.PI, step: Math.PI / 12 }),
        p('variation', ParamTypes.PERCENT, 0.1,
            "Amount of random variation in the crystal structure.",
            { min: 0, max: 0.3, step: 0.01 })
    ],
    (args, params) => {
        // Rotate coordinates to match the crystal orientation
        const cos_theta = Math.cos(params.orientation);
        const sin_theta = Math.sin(params.orientation);
        const x_rot = args.dx * cos_theta - args.dy * sin_theta;
        const y_rot = args.dx * sin_theta + args.dy * cos_theta;

        // Scale by unit cell size
        const x_scaled = x_rot / params.unit_cell_size;
        const y_scaled = y_rot / params.unit_cell_size;

        // Determine which lattice point this coordinate is closest to
        let lattice_x, lattice_y, distance, angle;

        switch (Math.floor(params.lattice_type)) {
            case 0: // Cubic
                // Simple cubic lattice - evenly spaced grid
                lattice_x = Math.round(x_scaled);
                lattice_y = Math.round(y_scaled);

                // Calculate distance to nearest lattice point
                distance = Math.sqrt(Math.pow(x_scaled - lattice_x, 2) +
                    Math.pow(y_scaled - lattice_y, 2));

                // Create deterministic but seemingly random angle for each lattice point
                angle = ((lattice_x * 13) ^ (lattice_y * 7)) % 180;
                angle = (angle / 180) * Math.PI;
                break;

            case 1: // Hexagonal
                // Hexagonal lattice
                // First find the nearest point in a skewed coordinate system
                const hex_x = Math.round(x_scaled);
                const hex_y = Math.round(y_scaled - 0.5 * (hex_x % 2));

                // Convert back to original space
                lattice_x = hex_x;
                lattice_y = hex_y + 0.5 * (hex_x % 2);

                // Calculate distance to nearest lattice point
                distance = Math.sqrt(Math.pow(x_scaled - lattice_x, 2) +
                    Math.pow(y_scaled - lattice_y, 2));

                // Create deterministic angle
                angle = ((lattice_x * 17) ^ (lattice_y * 11)) % 120;
                angle = (angle / 120) * Math.PI;
                break;

            case 2: // Tetragonal
                // Rectangular lattice with different x and y spacing
                lattice_x = Math.round(x_scaled);
                lattice_y = Math.round(y_scaled * 0.5) * 2; // Double the y-spacing

                distance = Math.sqrt(Math.pow(x_scaled - lattice_x, 2) +
                    Math.pow(y_scaled - lattice_y * 0.5, 2));

                angle = ((lattice_x * 19) ^ (lattice_y * 23)) % 90;
                angle = (angle / 90) * Math.PI;
                break;

            case 3: // Diamond
                // Diamond has two interlaced cubic lattices
                const x1 = Math.round(x_scaled);
                const y1 = Math.round(y_scaled);
                const dist1 = Math.sqrt(Math.pow(x_scaled - x1, 2) + Math.pow(y_scaled - y1, 2));

                const x2 = Math.round(x_scaled - 0.5);
                const y2 = Math.round(y_scaled - 0.5);
                const dist2 = Math.sqrt(Math.pow(x_scaled - (x2 + 0.5), 2) +
                    Math.pow(y_scaled - (y2 + 0.5), 2));

                if (dist1 <= dist2) {
                    lattice_x = x1;
                    lattice_y = y1;
                    distance = dist1;
                } else {
                    lattice_x = x2 + 0.5;
                    lattice_y = y2 + 0.5;
                    distance = dist2;
                }

                angle = ((Math.round(lattice_x * 100) * 31) ^ (Math.round(lattice_y * 100) * 37)) % 60;
                angle = (angle / 60) * Math.PI;
                break;

            default:
                return args.radial_angle;
        }

        // Add variation if enabled
        if (params.variation > 0) {
            // Create a pseudo-random value based on lattice coordinates
            const seed = (lattice_x * 12345 + lattice_y * 67890) & 0xFFFF;
            const variation = ((seed * 1013904223) & 0xFFFF) / 0xFFFF;

            // Scale by the variation parameter
            angle += (variation - 0.5) * params.variation * Math.PI;
        }

        return angle;
    }
);

// #region computation/rendering

// Compute the centroid of the points.
function computeCentroid(points, customCenter = null) {
    if (customCenter && typeof customCenter.x === 'number' && typeof customCenter.y === 'number') {
        return { cx: customCenter.x, cy: customCenter.y };
    }

    let sumX = 0, sumY = 0;
    for (let [label, x, y] of points) {
        sumX += x;
        sumY += y;
    }
    return { cx: sumX / points.length, cy: sumY / points.length };
}

function calculateAngles(points, rotationFormula, globalParams = {}) {
    // Get custom centroid from global parameters
    const customCenter = globalParams.custom_centroid &&
        typeof globalParams.custom_centroid.x === 'number' &&
        typeof globalParams.custom_centroid.y === 'number' ?
        convertNormalizedToAbsolute(globalParams.custom_centroid, points) : null;

    // Use the custom center or fall back to natural centroid
    const { cx, cy } = computeCentroid(points, customCenter);

    const distances = points.map(([label, x, y]) => Math.hypot(x - cx, y - cy));
    const maxDistance = distances.length ? Math.max(...distances) : 0;

    const result = [];
    for (let i = 0; i < points.length; i++) {
        const [label, x, y] = points[i];
        const dx = x - cx;
        const dy = y - cy;
        const dist = distances[i];

        // Apply radial offset if specified
        let radialAngle = Math.atan2(dy, dx);
        if (globalParams.radial_offset) {
            radialAngle += globalParams.radial_offset;
        }

        // Call the shader's rotation formula with normalized coordinates
        let angleRad = rotationFormula({
            radial_angle: radialAngle,
            radius: dist / maxDistance,
            dx: dx / maxDistance,
            dy: dy / maxDistance,
            label: label
        });

        // Apply counter-rotation if enabled
        if (globalParams.counter_rotate) {
            angleRad *= -1;
        }

        // Apply fixed offset
        if (globalParams.fixed_offset) {
            angleRad += globalParams.fixed_offset;
        }

        // Apply quantization if enabled
        if (globalParams.quantize > 0) {
            angleRad = Math.round(angleRad / globalParams.quantize) * globalParams.quantize;
        }

        let angleDeg = (angleRad * 180 / Math.PI) % 360;
        if (angleDeg < 0) angleDeg += 360;
        result.push({ label, x, y, angleDeg });
    }
    return result;
}

// Helper function to convert normalized coordinates to absolute
function convertNormalizedToAbsolute(normalizedCoord, points) {
    const naturalCentroid = computeCentroid(points);

    // Calculate bounds to determine scaling
    const { minX, maxX, minY, maxY } = calculatePointsBounds(points);
    const boundsWidth = maxX - minX;
    const boundsHeight = maxY - minY;
    const maxDimension = Math.max(boundsWidth, boundsHeight) / 2;

    // Convert normalized coordinates (-1 to 1) to absolute coordinates
    return {
        x: naturalCentroid.cx + (normalizedCoord.x * maxDimension),
        y: naturalCentroid.cy + (normalizedCoord.y * maxDimension)
    };
}

// Function to calculate bounds of the points dataset
function calculatePointsBounds(pointsArray) {
    if (!pointsArray || pointsArray.length === 0) {
        return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
    }

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

    for (const [_, x, y] of pointsArray) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
    }

    return { minX, maxX, minY, maxY };
}

function visualize(pointsWithAngles, options = {}) {
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');

    const bgColor = document.getElementById('background-color').value;

    // Clear the canvas.
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const scale = 10;  // 10 pixels per mm
    const ledPackage = document.getElementById('led-package').value;
    const ledColor = document.getElementById('led-color').value;
    const [ledWidth, ledHeight] = getLedSize(ledPackage, Units.MM);

    // Get custom centroid from options and convert from normalized to absolute if needed
    let customCenter = null;
    if (options.customCenter &&
        typeof options.customCenter.x === 'number' &&
        typeof options.customCenter.y === 'number') {

        customCenter = convertNormalizedToAbsolute(options.customCenter, points);
    }

    const { cx, cy } = computeCentroid(points, customCenter);

    // Calculate the bounds of the current points dataset
    const pointsForBounds = pointsWithAngles.map(({ label, x, y }) => [label, x, y]);
    const { minX, maxX, minY, maxY } = calculatePointsBounds(pointsForBounds);

    // Calculate the center of the bounding box
    const boundsWidth = maxX - minX;
    const boundsHeight = maxY - minY;
    const boundsMiddleX = minX + boundsWidth / 2;
    const boundsMiddleY = minY + boundsHeight / 2;

    // Determine a good scaling factor to fit all points on the canvas with some margin
    const xScale = (canvas.width - 80) / (boundsWidth || 1); // 40px margin on each side
    const yScale = (canvas.height - 80) / (boundsHeight || 1); // 40px margin on each side
    const dynamicScale = Math.min(xScale, yScale, scale);
    const finalScale = dynamicScale > scale ? scale : dynamicScale;

    // For visualization, we translate the coordinate system:
    ctx.save();
    // Translate origin to the center of the canvas.
    ctx.translate(canvas.width / 2, canvas.height / 2);
    // Flip the y-axis so positive y goes up.
    ctx.scale(1, -1);

    // Draw the centroid cross
    const crossSize = 4; // Size of the cross in screen pixels
    ctx.strokeStyle = '#c0c0c0';
    ctx.lineWidth = 1;

    // Adjust the centroid position for visualization
    const centroidX = (cx - boundsMiddleX) * finalScale;
    const centroidY = (cy - boundsMiddleY) * finalScale;

    // Draw horizontal line of the cross
    ctx.beginPath();
    ctx.moveTo(centroidX - crossSize, centroidY);
    ctx.lineTo(centroidX + crossSize, centroidY);
    ctx.stroke();

    // Draw vertical line of the cross
    ctx.beginPath();
    ctx.moveTo(centroidX, centroidY - crossSize);
    ctx.lineTo(centroidX, centroidY + crossSize);
    ctx.stroke();

    // Draw each LED as a rotated rectangle.
    pointsWithAngles.forEach(({ label, x, y, angleDeg }) => {
        // Adjust point positions using the bounds center for dynamic centering
        const px = (x - boundsMiddleX) * finalScale;
        const py = (y - boundsMiddleY) * finalScale;
        const angleRad = angleDeg * Math.PI / 180;

        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(angleRad);
        // Draw a filled rectangle with a stroke.
        ctx.fillStyle = ledColor;
        ctx.strokeStyle = 'black';
        ctx.fillRect(- (ledWidth * finalScale) / 2, - (ledHeight * finalScale) / 2, ledWidth * finalScale, ledHeight * finalScale);
        ctx.strokeRect(- (ledWidth * finalScale) / 2, - (ledHeight * finalScale) / 2, ledWidth * finalScale, ledHeight * finalScale);

        // Add direction indicator
        ctx.beginPath();
        ctx.moveTo((ledWidth * finalScale) / 2, 0);
        ctx.lineTo((ledWidth * finalScale) / 2 + 3, 0);
        ctx.strokeStyle = '#e74c3c';
        ctx.stroke();

        ctx.restore();
    });

    ctx.restore();
}

// #region UI management

function populateShaderSelect() {
    const select = document.getElementById('shader-select');
    const shaderNames = Object.keys(shaderRegistry);

    // Sort the shader names alphabetically
    shaderNames.sort();

    function snakeToReadable(snakeCase) {
        return snakeCase
            .replace(/_/g, ' ') // Replace underscores with spaces
            .replace(/\b\w/g, (char) => char.toUpperCase()); // Capitalize first letter of each word
    }

    select.innerHTML = shaderNames
        .map(name => `<option value="${name}">${snakeToReadable(name)}</option>`)
        .join('');

    // set the default
    if (DEFAULT_SHADER && shaderRegistry[DEFAULT_SHADER]) {
        select.value = DEFAULT_SHADER;
    }

    select.dispatchEvent(new Event('change'));
}

// Populates the UI with controls for the selected shader's parameters
function populateShaderParams() {
    const container = document.getElementById('shader-params-container');
    container.innerHTML = '';
    const shaderName = document.getElementById('shader-select').value;
    const shader = shaderRegistry[shaderName];

    // Add shader description
    addShaderDescription(shader, container);

    // Create UI controls for each parameter
    if (shader?.params?.length) {
        shader.params.forEach(param => {
            createParameterControl(param, container);
        });

        // Show reset button if there are parameters
        document.getElementById('shader-reset-button').style.display = 'block';
    } else {
        document.getElementById('shader-reset-button').style.display = 'none';
    }
}

function populateGlobalParams() {
    const container = document.getElementById('global-params-container');
    container.innerHTML = '';

    // Create UI controls for each global parameter
    if (globalParams.length) {
        globalParams.forEach(param => {
            createParameterControl(param, container, 'global-param-');
        });
    }
}

// Adds the shader description to the container if available
function addShaderDescription(shader, container) {
    if (shader?.desc) {
        const descDiv = document.createElement('div');
        descDiv.classList.add('param-description');
        descDiv.style.marginBottom = '15px';
        descDiv.textContent = shader.desc;
        container.appendChild(descDiv);
    }
}

// Creates the appropriate control for a shader parameter
function createParameterControl(param, container, idPrefix = 'param-') {
    const div = document.createElement('div');
    div.classList.add('control-item');

    if (param.paramType === ParamTypes.BOOLEAN) {
        createToggleSwitch(param, div, idPrefix);
    } else if (param.paramType === ParamTypes.COORDINATE) {
        createCoordinateInput(param, div, idPrefix);
    } else if (isRangeParameter(param)) {
        createRangeSlider(param, div, idPrefix);
    } else {
        createNumberInput(param, div, idPrefix);
    }

    // Add parameter description if available
    if (param.description) {
        const description = document.createElement('div');
        description.classList.add('param-description');
        description.textContent = param.description;
        div.appendChild(description);
    }

    container.appendChild(div);
}

// Creates a toggle switch for boolean parameters
function createToggleSwitch(param, container, idPrefix = 'param-') {
    // Create container
    const switchContainer = document.createElement('div');
    switchContainer.className = 'switch-container';

    // Create label
    const label = document.createElement('label');
    label.setAttribute('for', `${idPrefix}${param.name}`);
    label.textContent = formatParameterName(param.name);

    // Create switch
    const switchLabel = document.createElement('label');
    switchLabel.className = 'switch';

    // Create input
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.id = `${idPrefix}${param.name}`;
    input.checked = param.defaultValue === true;

    // Create slider
    const slider = document.createElement('span');
    slider.className = 'slider';

    // Assemble the toggle switch
    switchLabel.appendChild(input);
    switchLabel.appendChild(slider);
    switchContainer.appendChild(label);
    switchContainer.appendChild(switchLabel);

    container.appendChild(switchContainer);
}

// Creates a range slider with value display
function createRangeSlider(param, container, idPrefix = 'param-') {
    // Create label
    const label = document.createElement('label');
    label.setAttribute('for', `${idPrefix}${param.name}`);
    label.textContent = formatParameterName(param.name);

    // Create value display
    const valueDisplay = document.createElement('span');
    valueDisplay.classList.add('value-display');
    valueDisplay.textContent = formatValue(param.defaultValue, param);
    label.appendChild(valueDisplay);

    // Create slider
    const input = document.createElement('input');
    input.type = 'range';
    input.id = `${idPrefix}${param.name}`;

    // Set min, max, and step attributes
    setRangeAttributes(input, param);

    // Set value after min/max/step to avoid browser rounding issues
    input.value = param.defaultValue.toString();

    // Update value display when slider changes
    input.addEventListener('input', () => {
        valueDisplay.textContent = formatValue(input.value, param);
    });

    container.appendChild(label);
    container.appendChild(input);
}

// Creates a number input for numeric parameters
function createNumberInput(param, container, idPrefix = 'param-') {
    // Create label
    const label = document.createElement('label');
    label.setAttribute('for', `${idPrefix}${param.name}`);
    label.textContent = formatParameterName(param.name);

    // Create input
    const input = document.createElement('input');
    input.type = 'number';
    input.id = `${idPrefix}${param.name}`;

    if (param.min !== null) input.min = param.min;
    if (param.max !== null) input.max = param.max;
    if (param.step !== null) input.step = param.step;

    input.value = param.defaultValue.toString();

    container.appendChild(label);
    container.appendChild(input);
}

// Create a new function to handle coordinate input UI
function createCoordinateInput(param, container, idPrefix = 'param-') {
    // Create label
    const label = document.createElement('label');
    label.textContent = formatParameterName(param.name);
    container.appendChild(label);

    // Create coordinate container
    const coordContainer = document.createElement('div');
    coordContainer.classList.add('coordinate-container');

    // Create X input group
    const xGroup = document.createElement('div');
    xGroup.classList.add('coordinate-input-group');

    const xLabel = document.createElement('span');
    xLabel.textContent = 'X:';
    xLabel.classList.add('coordinate-label');
    xGroup.appendChild(xLabel);

    const xInput = document.createElement('input');
    xInput.type = 'number';
    xInput.id = `${idPrefix}${param.name}-x`;
    xInput.value = param.defaultValue.x.toString();
    xInput.step = param.step || 0.1;
    if (param.min !== null) xInput.min = param.min;
    if (param.max !== null) xInput.max = param.max;
    xGroup.appendChild(xInput);

    // Create Y input group
    const yGroup = document.createElement('div');
    yGroup.classList.add('coordinate-input-group');

    const yLabel = document.createElement('span');
    yLabel.textContent = 'Y:';
    yLabel.classList.add('coordinate-label');
    yGroup.appendChild(yLabel);

    const yInput = document.createElement('input');
    yInput.type = 'number';
    yInput.id = `${idPrefix}${param.name}-y`;
    yInput.value = param.defaultValue.y.toString();
    yInput.step = param.step || 0.1;
    if (param.min !== null) yInput.min = param.min;
    if (param.max !== null) yInput.max = param.max;
    yGroup.appendChild(yInput);

    // Container for the buttons
    const buttonGroup = document.createElement('div');
    buttonGroup.classList.add('coordinate-button-group');

    // Crosshair button for picking coordinates on canvas
    const pickButton = document.createElement('button');
    pickButton.classList.add('coordinate-button', 'coordinate-pick-button');
    pickButton.title = 'Pick coordinate on canvas';
    pickButton.dataset.paramName = param.name;
    pickButton.dataset.paramPrefix = idPrefix;
    pickButton.addEventListener('click', () => {
        activateCoordinatePicker(param.name, idPrefix);
    });

    // Reset button to restore default values
    const resetButton = document.createElement('button');
    resetButton.classList.add('coordinate-button', 'coordinate-reset-button');
    resetButton.title = 'Reset to default values';
    resetButton.dataset.paramName = param.name;
    resetButton.dataset.paramPrefix = idPrefix;
    resetButton.addEventListener('click', () => {
        // Reset to default values
        xInput.value = param.defaultValue.x.toString();
        yInput.value = param.defaultValue.y.toString();

        // Trigger change event to update visualization
        xInput.dispatchEvent(new Event('change'));
        yInput.dispatchEvent(new Event('change'));

        updateVisualization();
        showNotification(`Reset ${formatParameterName(param.name)} to default values`, false, 'success');
    });

    // Add the buttons to the button group
    buttonGroup.appendChild(resetButton);
    buttonGroup.appendChild(pickButton);

    // Assemble the UI elements
    coordContainer.appendChild(xGroup);
    coordContainer.appendChild(yGroup);
    coordContainer.appendChild(buttonGroup);
    container.appendChild(coordContainer);
}

// Sets attributes for range inputs based on parameter type
function setRangeAttributes(input, param) {
    // Set min and max values
    if (param.min !== null) input.min = param.min;
    if (param.max !== null) input.max = param.max;

    // Set step value
    if (param.step !== null) {
        input.step = param.step;
    } else if (param.paramType === ParamTypes.INTEGER) {
        input.step = 1;
    } else if (param.paramType === ParamTypes.PERCENT) {
        input.step = 0.05;
    }

    // Set default min/max for specific parameter types
    if (param.paramType === ParamTypes.PERCENT) {
        if (param.min === null) input.min = 0;
        if (param.max === null) input.max = 1;
    } else if (param.paramType === ParamTypes.ANGLE) {
        if (param.min === null) input.min = 0;
        if (param.max === null) input.max = 2 * Math.PI;
    }
}

// Formats a parameter value for display based on its type
function formatValue(value, param) {
    if (param.paramType === ParamTypes.ANGLE) {
        // Round to nearest 0.5 degrees
        return Math.round(value * (180 / Math.PI) * 2) / 2 + '°';
    } else if (param.step === 1 || param.paramType === ParamTypes.INTEGER) {
        return parseInt(value);
    } else if (param.paramType === ParamTypes.PERCENT) {
        // Round to nearest 0.5%
        return Math.round(parseFloat(value) * 200) / 2 + '%';
    } else {
        return parseFloat(value).toFixed(2);
    }
}

// Formats a parameter name for display
function formatParameterName(name) {
    return name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// Determines if a parameter should use a range slider
function isRangeParameter(param) {
    return (param.min !== null && param.max !== null) ||
        param.paramType === ParamTypes.PERCENT ||
        param.paramType === ParamTypes.ANGLE;
}

function resetShaderParameters() {
    const shaderName = document.getElementById('shader-select').value;
    const shader = shaderRegistry[shaderName];

    if (!shader || !shader.params || shader.params.length === 0) {
        return; // No parameters to reset
    }

    // Reset each parameter to its default value
    shader.params.forEach(param => {
        const inputElem = document.getElementById(`param-${param.name}`);
        if (!inputElem) return;

        if (param.paramType === ParamTypes.BOOLEAN) {
            inputElem.checked = param.defaultValue === true;
            // Trigger a change event for checkboxes
            inputElem.dispatchEvent(new Event('change'));
        } else {
            inputElem.value = param.defaultValue.toString();
            // Trigger the appropriate event to update any UI elements (like value displays)
            const eventType = inputElem.type === 'range' ? 'input' : 'change';
            inputElem.dispatchEvent(new Event(eventType));
        }
    });

    // Update visualization and save state
    updateVisualization();

    // Show notification
    showNotification('Parameters reset to default values', false, 'success');
}

let g_cachedAngles = [];

function updateVisualization() {
    const shaderName = document.getElementById('shader-select').value;
    const shader = shaderRegistry[shaderName];
    if (!shader) return;

    // Get shader parameters
    const shaderParams = {};
    if (shader.params) {
        shader.params.forEach(param => {
            if (param.paramType === ParamTypes.BOOLEAN) {
                const input = document.getElementById(`param-${param.name}`);
                shaderParams[param.name] = input?.checked || param.defaultValue;
            } else if (param.paramType === ParamTypes.COORDINATE) {
                const xInput = document.getElementById(`param-${param.name}-x`);
                const yInput = document.getElementById(`param-${param.name}-y`);
                shaderParams[param.name] = {
                    x: parseFloat(xInput?.value) || param.defaultValue.x,
                    y: parseFloat(yInput?.value) || param.defaultValue.y
                };
            } else {
                const input = document.getElementById(`param-${param.name}`);
                shaderParams[param.name] = parseFloat(input?.value) || param.defaultValue;
            }
        });
    }

    // Get global parameters
    const globalParamValues = getGlobalParamValues();

    g_cachedAngles = calculateAngles(points,
        (args) => shader.fn(args, shaderParams),
        globalParamValues
    );
    visualize(g_cachedAngles, { customCenter: globalParamValues.custom_centroid });

    saveShaderStateToLocalStorage();
}

function getGlobalParamValues() {
    const globalParamValues = {};
    globalParams.forEach(param => {
        if (param.paramType === ParamTypes.BOOLEAN) {
            const input = document.getElementById(`global-param-${param.name}`);
            globalParamValues[param.name] = input?.checked || param.defaultValue;
        } else if (param.paramType === ParamTypes.COORDINATE) {
            const xInput = document.getElementById(`global-param-${param.name}-x`);
            const yInput = document.getElementById(`global-param-${param.name}-y`);

            // Only include if both x and y have valid values
            if (xInput && yInput && !isNaN(parseFloat(xInput.value)) && !isNaN(parseFloat(yInput.value))) {
                globalParamValues[param.name] = {
                    x: parseFloat(xInput.value),
                    y: parseFloat(yInput.value)
                };
            }
        } else {
            const input = document.getElementById(`global-param-${param.name}`);
            if (input && !isNaN(parseFloat(input.value))) {
                globalParamValues[param.name] = parseFloat(input.value);
            }
        }
    });

    return globalParamValues;
}

let g_coordinatePickingMode = false;
let g_currentPickingParam = null;
let g_currentPickingPrefix = null;

// In document ready or initialization function
function initPickerFunctionality() {
    const canvas = document.getElementById('canvas');

    // Canvas click handler
    canvas.addEventListener('click', (e) => {
        if (g_coordinatePickingMode) {
            handleCoordinatePickingClick(e);
        }
    });
}

function activateCoordinatePicker(paramName, idPrefix = 'param-') {
    const canvas = document.getElementById('canvas');

    // Exit if already in any picking mode
    if (g_coordinatePickingMode) {
        exitCoordinatePicker();
        return;
    }

    // Enter picking mode
    g_coordinatePickingMode = true;
    g_currentPickingParam = paramName;
    g_currentPickingPrefix = idPrefix;

    // Change cursor to crosshair
    canvas.style.cursor = 'crosshair';

    // Disable the pick button
    const pickButton = document.querySelector(`button[data-param-name="${paramName}"][data-param-prefix="${idPrefix}"]`);
    if (pickButton) pickButton.disabled = true;

    // Show notification
    showNotification(`Click on canvas to set coordinate for ${formatParameterName(paramName)}, or press Esc to cancel`, false, 'info');
}

function exitCoordinatePicker() {
    const canvas = document.getElementById('canvas');

    // Reset cursor
    canvas.style.cursor = 'default';

    // Re-enable the pick button if there was an active parameter
    if (g_currentPickingParam && g_currentPickingPrefix) {
        const pickButton = document.querySelector(`button[data-param-name="${g_currentPickingParam}"][data-param-prefix="${g_currentPickingPrefix}"]`);
        if (pickButton) pickButton.disabled = false;
    }

    // Reset state
    g_coordinatePickingMode = false;
    g_currentPickingParam = null;
    g_currentPickingPrefix = null;
}

function handleCoordinatePickingClick(e) {
    if (!g_coordinatePickingMode || !g_currentPickingParam) return;

    // Get canvas position and dimensions
    const canvas = document.getElementById('canvas');
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    // Calculate clicked position in canvas coordinates
    const canvasX = (e.clientX - rect.left) * scaleX;
    const canvasY = (e.clientY - rect.top) * scaleY;

    // Calculate bounds and scale exactly as visualize does
    const pointsForBounds = points.map(([label, x, y]) => [label, x, y]);
    const { minX, maxX, minY, maxY } = calculatePointsBounds(pointsForBounds);
    const boundsWidth = maxX - minX;
    const boundsHeight = maxY - minY;
    const boundsMiddleX = minX + boundsWidth / 2;
    const boundsMiddleY = minY + boundsHeight / 2;

    // Calculate the scale factor that visualize uses
    const xScale = (canvas.width - 80) / (boundsWidth || 1);
    const yScale = (canvas.height - 80) / (boundsHeight || 1);
    const scale = 10;
    const dynamicScale = Math.min(xScale, yScale, scale);
    const finalScale = dynamicScale > scale ? scale : dynamicScale;

    // Transform canvas coordinates to centered, y-flipped system
    const centeredX = canvasX - canvas.width / 2;
    const centeredY = canvas.height / 2 - canvasY;

    // Convert to internal coordinate system
    const mmX = centeredX / finalScale + boundsMiddleX;
    const mmY = centeredY / finalScale + boundsMiddleY;

    // Calculate a threshold based on the LED package size for snapping
    const ledPackage = document.getElementById('led-package').value;
    const [ledWidth, ledHeight] = getLedSize(ledPackage, Units.MM);
    const clickThreshold = Math.sqrt(ledWidth * ledWidth + ledHeight * ledHeight) * 0.75;

    let closestLED = null;
    let minDistance = Infinity;

    // Find the closest LED to the click point
    for (const [label, ledX, ledY] of points) {
        const distance = Math.hypot(ledX - mmX, ledY - mmY);
        if (distance < minDistance) {
            minDistance = distance;
            closestLED = [label, ledX, ledY];
        }
    }

    // Check if inputs exist
    const xInput = document.getElementById(`${g_currentPickingPrefix}${g_currentPickingParam}-x`);
    const yInput = document.getElementById(`${g_currentPickingPrefix}${g_currentPickingParam}-y`);

    if (!xInput || !yInput) {
        exitCoordinatePicker();
        return;
    }

    // Always use normalized coordinates
    const naturalCentroid = computeCentroid(points);
    const maxDimension = Math.max(boundsWidth, boundsHeight) / 2;

    let coordX, coordY;
    let snappedToLed = false;

    // Use LED coordinates if close enough
    if (minDistance < clickThreshold && closestLED) {
        // Convert LED position to normalized coordinates
        coordX = (closestLED[1] - naturalCentroid.cx) / maxDimension;
        coordY = (closestLED[2] - naturalCentroid.cy) / maxDimension;
        snappedToLed = true;
    } else {
        // Convert click position to normalized coordinates
        coordX = (mmX - naturalCentroid.cx) / maxDimension;
        coordY = (mmY - naturalCentroid.cy) / maxDimension;
    }

    // Clamp to -1 to 1 range
    coordX = Math.max(-1, Math.min(1, coordX));
    coordY = Math.max(-1, Math.min(1, coordY));

    // Update input fields
    xInput.value = coordX.toFixed(2);
    yInput.value = coordY.toFixed(2);

    // Trigger change events to update visualization
    xInput.dispatchEvent(new Event('change'));
    yInput.dispatchEvent(new Event('change'));

    // Show appropriate notification
    if (snappedToLed) {
        showNotification(`Snapped to LED '${closestLED[0]}' for ${formatParameterName(g_currentPickingParam)}`, false, 'success');
    } else {
        showNotification(`Coordinate for ${formatParameterName(g_currentPickingParam)} set to (${coordX.toFixed(2)}, ${coordY.toFixed(2)})`, false, 'success');
    }

    updateVisualization();

    // Exit coordinate picking mode
    exitCoordinatePicker();
}

function showNotification(message, isError = false, type = null) {
    const notification = document.getElementById('state-notification');
    const messageElement = document.getElementById('notification-message');

    // Set the message
    messageElement.textContent = message;

    // Remove existing classes
    notification.classList.remove('success', 'error', 'info', 'show');

    // Add appropriate class based on type
    if (type) {
        notification.classList.add(type);
    } else {
        notification.classList.add(isError ? 'error' : 'success');
    }

    // Show the notification
    notification.classList.add('show');

    // Hide notification after 3 seconds
    clearTimeout(notification.timeout);
    notification.timeout = setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

function initCollapsibleSections() {
    // Find all collapsible sections
    const sections = document.querySelectorAll('.collapsible-section');

    // Set up each section
    sections.forEach(section => {
        const header = section.querySelector('.collapsible-header');

        // Optional: Some sections can start collapsed by default
        if (section.dataset.defaultCollapsed === 'true') {
            section.classList.add('collapsed');
        }

        // Add click handler to header
        header.addEventListener('click', () => {
            section.classList.toggle('collapsed');
        });
    });
}

// #region state serialization

// Function to generate the export CSV based on cached angles and orientation
function generateExportCSV() {
    if (!g_cachedAngles || g_cachedAngles.length === 0) {
        return "No angles calculated yet";
    }

    // Get the selected orientation adjustment
    const orientation = document.getElementById('export-orientation').value;

    // Calculate angle adjustment based on orientation
    let angleAdjustment = 0;
    if (orientation === 'up') angleAdjustment = 90;
    else if (orientation === 'left') angleAdjustment = 180;
    else if (orientation === 'down') angleAdjustment = 270;

    // Apply adjustment to angles
    const csv = g_cachedAngles.map(p => {
        const adjustedAngle = (p.angleDeg - angleAdjustment + 360) % 360;
        return `${p.label},${adjustedAngle.toFixed(2)}`;
    }).join('\n');

    return csv;
}

function serializeState(include_data) {
    const shaderName = document.getElementById('shader-select').value;
    const shader = shaderRegistry[shaderName];

    // Create the state object with shader selection
    const state = {
        version: 1,
        shaderName: shaderName,
        shaderParams: {},
        globalParams: {},
    };

    if (include_data) {
        state.points = points.map(p => [...p]); // Deep copy to avoid reference issues
        state.displayOptions = {
            ledPackage: document.getElementById('led-package').value,
            ledColor: document.getElementById('led-color').value,
            backgroundColor: document.getElementById('background-color').value
        };
    }

    // Add all shader parameters
    if (shader && shader.params) {
        shader.params.forEach(param => {
            serializeParameter(param, 'param-', state.shaderParams);
        });
    }

    // Add all global parameters
    if (globalParams) {
        globalParams.forEach(param => {
            serializeParameter(param, 'global-param-', state.globalParams);
        });
    }

    return state;
}

function serializeParameter(param, idPrefix, targetObj) {
    if (param.paramType === ParamTypes.BOOLEAN) {
        const inputElem = document.getElementById(`${idPrefix}${param.name}`);
        targetObj[param.name] = inputElem?.checked || false;
    } else if (param.paramType === ParamTypes.COORDINATE) {
        const xInput = document.getElementById(`${idPrefix}${param.name}-x`);
        const yInput = document.getElementById(`${idPrefix}${param.name}-y`);

        if (xInput && yInput && !isNaN(parseFloat(xInput.value)) && !isNaN(parseFloat(yInput.value))) {
            targetObj[param.name] = {
                x: parseFloat(xInput.value),
                y: parseFloat(yInput.value)
            };
        } else {
            targetObj[param.name] = param.defaultValue;
        }
    } else {
        const inputElem = document.getElementById(`${idPrefix}${param.name}`);
        targetObj[param.name] = parseFloat(inputElem?.value) || param.defaultValue;
    }
}

function deserializeState(state) {
    // Validate the state object
    if (!state || typeof state !== 'object' || !state.shaderName) {
        console.error('Invalid state object:', state);
        return false;
    }

    try {
        // First, check if the shader exists
        if (!shaderRegistry[state.shaderName]) {
            console.warn(`Shader "${state.shaderName}" not found, using default`);
            return false;
        }

        // Set shader selection
        const shaderSelect = document.getElementById('shader-select');
        shaderSelect.value = state.shaderName;

        // IMPORTANT: Trigger the change event to populate shader parameters
        shaderSelect.dispatchEvent(new Event('change'));

        // After parameters are populated, set their values
        if (state.shaderParams) {
            const shader = shaderRegistry[state.shaderName];
            if (shader && shader.params) {
                shader.params.forEach(param => {
                    deserializeParameter(param, state.shaderParams, 'param-');
                });
            }
        }

        // Set global parameters
        if (state.globalParams && globalParams) {
            globalParams.forEach(param => {
                deserializeParameter(param, state.globalParams, 'global-param-');
            });
        }

        // Restore points if included
        if (state.points && Array.isArray(state.points) && state.points.length > 0) {
            points = state.points.map(p => [...p]); // Deep copy
            savePointsToCSV();
        }

        // Restore display options
        if (state.displayOptions) {
            if (state.displayOptions.ledPackage) {
                document.getElementById('led-package').value = state.displayOptions.ledPackage;
            }
            if (state.displayOptions.ledColor) {
                document.getElementById('led-color').value = state.displayOptions.ledColor;
            }
            if (state.displayOptions.backgroundColor) {
                document.getElementById('background-color').value = state.displayOptions.backgroundColor;
            }
        }

        // Update visualization
        updateVisualization();
        return true;
    } catch (error) {
        console.error('Error restoring state:', error);
        return false;
    }
}

function deserializeParameter(param, paramsObj, idPrefix) {
    if (!paramsObj.hasOwnProperty(param.name)) return;

    if (param.paramType === ParamTypes.BOOLEAN) {
        const inputElem = document.getElementById(`${idPrefix}${param.name}`);
        if (inputElem) {
            inputElem.checked = Boolean(paramsObj[param.name]);
            inputElem.dispatchEvent(new Event('change'));
        }
    } else if (param.paramType === ParamTypes.COORDINATE) {
        const xInput = document.getElementById(`${idPrefix}${param.name}-x`);
        const yInput = document.getElementById(`${idPrefix}${param.name}-y`);

        if (xInput && yInput && paramsObj[param.name]) {
            xInput.value = paramsObj[param.name].x;
            yInput.value = paramsObj[param.name].y;

            xInput.dispatchEvent(new Event('change'));
            yInput.dispatchEvent(new Event('change'));
        }
    } else {
        const inputElem = document.getElementById(`${idPrefix}${param.name}`);
        if (inputElem) {
            inputElem.value = paramsObj[param.name];

            // Trigger appropriate event for the input
            const eventType = inputElem.type === 'range' ? 'input' : 'change';
            inputElem.dispatchEvent(new Event(eventType));
        }
    }
}

// Convert state to a JSON string for export
function exportStateToJson(include_data) {
    const state = serializeState(include_data);
    return JSON.stringify(state);
}

function importStateFromJson(jsonString) {
    try {
        const state = JSON.parse(jsonString);
        return deserializeState(state);
    } catch (error) {
        console.error('Error parsing state JSON:', error);
        return false;
    }
}

// Serialize the current application state to a URL query parameter
function serializeStateToUrl(include_data) {
    // Convert to JSON
    const stateJson = exportStateToJson(include_data);

    // Generate the full URL with the state parameter
    const url = new URL(window.location.href);

    if (include_data && typeof JSONCrush !== "undefined") {
        // Use JSONCrush to compress the data when include_data is true
        const compressedState = JSONCrush.crush(stateJson);
        url.searchParams.set('restore_state', compressedState);
        url.searchParams.set('z', 'jc');
    } else {
        // Standard URL encoding for smaller states
        url.searchParams.set('restore_state', encodeURIComponent(stateJson));
    }

    // Remove any existing hash
    url.hash = '';

    return url.toString();
}

// Copy the current state URL to clipboard
function copyStateUrl(include_data) {
    const url = serializeStateToUrl(include_data);

    // Use the modern clipboard API if available
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url)
            .then(() => showNotification('URL copied to clipboard!'))
            .catch(err => {
                console.error('Failed to copy URL: ', err);
                showNotification('Failed to copy URL', true);
            });
    } else {
        // Fallback for browsers without clipboard API
        const tempInput = document.createElement('input');
        tempInput.value = url;
        document.body.appendChild(tempInput);
        tempInput.select();
        const success = document.execCommand('copy');
        document.body.removeChild(tempInput);

        if (success) {
            showNotification('URL copied to clipboard!');
        } else {
            showNotification('Failed to copy URL', true);
        }
    }
}

function loadStateFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const stateParam = urlParams.get('restore_state');
    const compressionType = urlParams.get('z');

    if (!stateParam) {
        return false;
    }

    try {
        let urlState;

        if (compressionType === 'jc') {
            if (typeof JSONCrush === "undefined") {
                throw new Error('JSONCrush library not available');
            }
            // Decompress with JSONCrush if compression is specified
            const decompressedState = JSONCrush.uncrush(stateParam);
            urlState = JSON.parse(decompressedState);
        } else {
            // Standard decoding for uncompressed state
            urlState = JSON.parse(decodeURIComponent(stateParam));
        }

        // Apply the state
        const success = deserializeState(urlState);

        if (success) {
            showNotification('Configuration loaded successfully!', false, 'success');

            // Clean up the URL after successful loading
            // This prevents accidental reloads from re-applying the state
            const url = new URL(window.location.href);
            url.searchParams.delete('restore_state');
            url.searchParams.delete('z');
            window.history.replaceState({}, document.title, url.toString());

            return true;
        } else {
            showNotification('Failed to load configuration', true, 'error');
        }
    } catch (error) {
        showNotification('Error loading configuration', true, 'error');
        console.error('Error loading state from URL:', error);
    }

    return false;
}

// #region DOM init

document.addEventListener('DOMContentLoaded', () => {

    loadPointsFromLocalStorage();
    loadAppearanceSettings();

    // Modal handling
    document.getElementById('import-btn').addEventListener('click', () => {
        document.getElementById('import-csv-text').value = points.map(p => p.join(',')).join('\n');
        document.getElementById('import-error').textContent = '';
        document.getElementById('import-modal').style.display = 'flex';

        const savedUnits = localStorage.getItem('led-points-units') || Units.MM;
        const unitsDropdown = document.getElementById('import-units');
        if (unitsDropdown) {
            unitsDropdown.value = savedUnits;
        }
    });

    document.getElementById('export-btn').addEventListener('click', () => {
        document.getElementById('export-csv-text').value = generateExportCSV();
        document.getElementById('export-modal').style.display = 'flex';
    });

    document.getElementById('export-orientation').addEventListener('change', function () {
        if (document.getElementById('export-modal').style.display === 'flex') {
            document.getElementById('export-csv-text').value = generateExportCSV();
        }
    });

    // Update the import submit handler to use the selected units
    document.getElementById('import-submit').addEventListener('click', () => {
        try {
            const units = document.getElementById('import-units').value;
            const newPoints = parseCSV(document.getElementById('import-csv-text').value, units);
            points = newPoints;
            savePointsToCSV();
            updateVisualization();
            document.getElementById('import-modal').style.display = 'none';
        } catch (e) {
            document.getElementById('import-error').textContent = e.message;
        }
    });

    function closeImportModal() {
        document.getElementById('import-modal').style.display = 'none';
    }

    function closeExportModal() {
        document.getElementById('export-modal').style.display = 'none';
    }

    document.getElementById('import-cancel').addEventListener('click', closeImportModal);
    document.getElementById('import-close').addEventListener('click', closeImportModal);
    document.getElementById('export-close').addEventListener('click', closeExportModal);
    document.getElementById('export-cancel').addEventListener('click', closeExportModal);

    document.getElementById('restore-default-btn').addEventListener('click', restoreDefaultData);
    document.getElementById('generate-grid-btn').addEventListener('click', generateGrid);

    document.getElementById('grid-size').addEventListener('change', (e) => {
        document.getElementById('grid-size-text').innerText = `${e.target.value}x${e.target.value}`;
    });

    document.getElementById('shader-reset-button').addEventListener('click', resetShaderParameters);

    // Add clipboard functionality for export
    document.getElementById('export-copy').addEventListener('click', () => {
        const exportText = document.getElementById('export-csv-text');
        exportText.select();
        document.execCommand('copy');

        // Visual feedback
        const copyBtn = document.getElementById('export-copy');
        const originalText = copyBtn.textContent;
        copyBtn.textContent = 'Copied!';
        copyBtn.style.backgroundColor = '#2ecc71';

        setTimeout(() => {
            copyBtn.textContent = originalText;
            copyBtn.style.backgroundColor = '';
        }, 1500);
    });

    const globalParamsContainer = document.querySelector('#global-params-container');
    if (globalParamsContainer) {
        globalParamsContainer.addEventListener('input', updateVisualization);
        globalParamsContainer.addEventListener('change', updateVisualization);
    }

    // Add download functionality
    document.getElementById('export-download').addEventListener('click', () => {
        const exportText = document.getElementById('export-csv-text').value;
        const blob = new Blob([exportText], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'led_angles.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });

    initCollapsibleSections();

    // Add handlers for LED customization options
    function appearanceUpdateHandler() {
        saveAppearanceSettings();
        updateVisualization(); // might be redundant with sidebar change handler
    }
    document.getElementById('led-package').addEventListener('change', appearanceUpdateHandler);
    document.getElementById('led-color').addEventListener('change', appearanceUpdateHandler);
    document.getElementById('background-color').addEventListener('change', appearanceUpdateHandler);

    // Set up shader select change handler
    document.getElementById('shader-select').addEventListener('change', populateShaderParams);

    // Listen for input and change events on the sidebar that contains all controls
    // This uses event delegation to catch events from all child controls
    const sidebar = document.querySelector('.sidebar');
    sidebar.addEventListener('input', updateVisualization);
    sidebar.addEventListener('change', updateVisualization);

    document.getElementById('share-state-btn').addEventListener('click', () => {
        copyStateUrl(false);
    });

    document.getElementById('share-state-and-data-btn').addEventListener('click', () => {
        copyStateUrl(true);
    });

    // Handle Escape key to cancel crosshair mode
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (g_coordinatePickingMode) {
                exitCoordinatePicker();
                showNotification('Coordinate selection cancelled', false, 'info');
            } else if (document.getElementById('export-modal').style.display !== 'none') {
                closeExportModal();
            } else if (document.getElementById('import-modal').style.display !== 'none') {
                closeImportModal();
            }
        }
    });

    // initCentroidUI();
    initPickerFunctionality();

    // Initial population and visualization
    populateShaderSelect();
    populateGlobalParams();

    if (!loadStateFromUrl()) {
        loadShaderStateFromLocalStorage();
    }

    updateVisualization();
});

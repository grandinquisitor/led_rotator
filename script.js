// #region utils

// Units and LED package definitions
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


// #region data
// Example set of points (label, x, y)
let points = [
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

// Load initial points from localStorage
(() => {
    try {
        const savedCSV = localStorage.getItem('led-points-csv');
        const savedUnits = localStorage.getItem('led-points-units') || Units.MM;
        if (savedCSV) {
            points = parseCSV(savedCSV, savedUnits);
        } else {
            savePointsToCSV();
        }
    } catch (e) {
        console.error('Error loading points:', e);
        savePointsToCSV();
    }
})();

function parseCSV(csvText, units = Units.MM) {
    const lines = csvText.split('\n');
    const parsedPoints = [];
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        const parts = trimmed.split(',').map(p => p.trim());
        if (parts.length !== 3) throw new Error(`Invalid line: ${line}`);
        const label = parts[0];
        const x = parseFloat(parts[1]);
        const y = parseFloat(parts[2]);
        if (isNaN(x) || isNaN(y)) throw new Error(`Invalid numbers in line: ${line}`);

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

function savePointsToCSV() {
    const csv = points.map(p => p.join(',')).join('\n');
    localStorage.setItem('led-points-csv', csv);
}

// #region Shader Definitions
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

const shaderRegistry = {};
function registerShader(name, description, paramDefs, shaderFn) {
    if (typeof name !== 'string') {
        throw new TypeError("Shader name must be a string.");
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

    // Optionally, you can also check that each item in paramDefs is a Param object
    paramDefs.forEach(param => {
        if (!(param instanceof Param)) {
            throw new TypeError("Each parameter definition must be a Param object.");
        }
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

// Perpendicular Rotation: Rotates the angle to be perpendicular to the radial direction.
registerShader(
    "radial_perpendicular",
    "Rotates the angle by subtracting the radial angle from 90 degrees, resulting in a perpendicular orientation.",
    [],
    (args) =>
        -args.radial_angle + Math.PI / 2
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
            { min: 0, max: 2 * Math.PI, step: Math.PI / 180 })
    ],
    (args, params) => {
        const pulse = Math.floor(args.radius * params.pulse_count / params.scaling);
        return args.radial_angle + (pulse % 2) * params.phase_shift;
    });

registerShader(
    "threshold_angles",
    "Assigns different angles to LEDs based on their distance from the center, with an optional crossfade.",
    [
        p('inner_angle', ParamTypes.ANGLE, 0,
            "Angle for LEDs inside the threshold radius.",
            { min: 0, max: Math.PI, step: Math.PI / 180 }),
        p('outer_angle', ParamTypes.ANGLE, Math.PI / 2,
            "Angle for LEDs outside the threshold radius.",
            { min: 0, max: Math.PI, step: Math.PI / 180 }),
        p('threshold', ParamTypes.PERCENT, 0.5,
            "Radial threshold that determines the boundary between inner and outer regions.",
            { min: 0, max: 1, step: 0.05 }),
        p('fade_width', ParamTypes.PERCENT, 0.1,
            "Width of the transition zone for crossfading between the two angles (0 means a hard edge).",
            { min: 0, max: 1, step: 0.01 })
    ],
    (args, params) => {
        // If fade_width is 0 or very small, use a hard threshold
        if (params.fade_width < 0.001) {
            return args.radius <= params.threshold ? params.inner_angle : params.outer_angle;
        }

        // Calculate the crossfade boundaries
        const lowerBound = Math.max(0, params.threshold - params.fade_width / 2);
        const upperBound = Math.min(1, params.threshold + params.fade_width / 2);

        if (args.radius <= lowerBound) {
            // Inside the inner region
            return params.inner_angle;
        } else if (args.radius >= upperBound) {
            // Outside the outer region
            return params.outer_angle;
        } else {
            // In the transition zone, interpolate between the two angles
            const t = (args.radius - lowerBound) / (upperBound - lowerBound);

            // Linear interpolation between the two angles
            // We need to handle the case where the angles cross the 0/2π boundary
            const diff = params.outer_angle - params.inner_angle;
            const shortestDiff = Math.abs(diff) <= Math.PI ? diff : diff - Math.sign(diff) * 2 * Math.PI;

            return params.inner_angle + t * shortestDiff;
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
            { min: 0.5, max: 20, step: 0.5 }),
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
        p('wave_direction', ParamTypes.ANGLE, 0,
            "Direction along which the waves propagate.",
            { min: 0, max: Math.PI, step: Math.PI / 180 }),
        p('frequency', ParamTypes.NUMBER, 1,
            "Number of complete waves that occur across the unit space.",
            { min: 0.5, max: 20, step: 0.5 }),
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

// Centroid Rotation: Returns the unmodified radial angle.
registerShader("radial", "Returns the original radial angle as the led angle, effectively centering the rotation.",
    [],
    (args) => args.radial_angle);

registerShader("polar_simple", "Set the angle according to simple polar effects.",
    [
        p('angle_effect', ParamTypes.ANGLE, 0, "Size of the effect of the polar theta.",
            { min: 0, max: Math.PI, step: Math.PI / 180 }),
        p('distance_effect', ParamTypes.PERCENT, 0, "Size of the effect of the radius."),
        p('invert_distance', ParamTypes.BOOLEAN, 0, "Invert radius; closer points affected more.")
    ],
    (args, params) =>
        args.radial_angle + params.angle_effect + (2 * Math.PI * (params.invert_distance ? 1 - args.radius : args.radius) * params.distance_effect)
);

registerShader("radial_circle", "Returns the original radial angle rotated by 180, effectively centering the rotation.",
    [],
    (args) => args.radial_angle + Math.PI / 2);

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
            { min: 2, max: null, step: 1 })
    ], (args, params) => {
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
    "random", null, [], (args, params) => Math.random() * 2 * Math.PI);

registerShader(
    "vortex",
    "Creates a swirling vortex effect with intensity increasing toward the center.",
    [
        p('intensity', ParamTypes.NUMBER, 2.0,
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
            "Controls how tightly the spiral winds (smaller values create tighter spirals).",
            { min: 0.1, max: 10, step: 0.1 })
    ],
    (args, params) =>
        args.radial_angle + params.growth_rate * Math.log(args.radius + 1)
);

registerShader(
    "wave_interference",
    "Simulates the interference pattern of multiple waves emanating from different points.",
    [
        p('source1_x', ParamTypes.NUMBER, 0.3,
            "X-coordinate of the first wave source (-1 to 1).",
            { min: -1, max: 1, step: 0.05 }),
        p('source1_y', ParamTypes.NUMBER, 0.3,
            "Y-coordinate of the first wave source (-1 to 1).",
            { min: -1, max: 1, step: 0.05 }),
        p('source2_x', ParamTypes.NUMBER, -0.3,
            "X-coordinate of the second wave source (-1 to 1).",
            { min: -1, max: 1, step: 0.05 }),
        p('source2_y', ParamTypes.NUMBER, -0.3,
            "Y-coordinate of the second wave source (-1 to 1).",
            { min: -1, max: 1, step: 0.05 }),
        p('frequency', ParamTypes.NUMBER, 10,
            "Wave frequency parameter.",
            { min: 1, max: 30, step: 0.5 })
    ],
    (args, params) => {
        // Calculate distances from wave sources
        const dist1 = Math.sqrt(
            Math.pow(args.dx - params.source1_x, 2) +
            Math.pow(args.dy - params.source1_y, 2)
        );
        const dist2 = Math.sqrt(
            Math.pow(args.dx - params.source2_x, 2) +
            Math.pow(args.dy - params.source2_y, 2)
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
        p('charge1_x', ParamTypes.NUMBER, 0.3,
            "X-coordinate of the first charge (-1 to 1).",
            { min: -1, max: 1, step: 0.05 }),
        p('charge1_y', ParamTypes.NUMBER, 0.3,
            "Y-coordinate of the first charge (-1 to 1).",
            { min: -1, max: 1, step: 0.05 }),
        p('charge1_value', ParamTypes.NUMBER, 1,
            "Value of the first charge (positive or negative).",
            { min: -3, max: 3, step: 0.1 }),
        p('charge2_x', ParamTypes.NUMBER, -0.3,
            "X-coordinate of the second charge (-1 to 1).",
            { min: -1, max: 1, step: 0.05 }),
        p('charge2_y', ParamTypes.NUMBER, -0.3,
            "Y-coordinate of the second charge (-1 to 1).",
            { min: -1, max: 1, step: 0.05 }),
        p('charge2_value', ParamTypes.NUMBER, -1,
            "Value of the second charge (positive or negative).",
            { min: -3, max: 3, step: 0.1 })
    ],
    (args, params) => {
        // Convert normalized coordinates to actual positions
        const c1x = params.charge1_x;
        const c1y = params.charge1_y;
        const c2x = params.charge2_x;
        const c2y = params.charge2_y;

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
    "Assigns different angles to each quadrant for clear direction patterns at low resolution.",
    [
        p('offset', ParamTypes.ANGLE, 0,
            "Angular offset applied to all quadrants.",
            { min: 0, max: Math.PI, step: Math.PI / 4 }),
    ],
    (args, params) => {
        // Determine quadrant (simplified to just positive/negative x and y)
        const x_positive = (args.dx >= 0);
        const y_positive = (args.dy >= 0);

        // Assign different angles to each quadrant
        if (x_positive && y_positive) return params.offset;          // Top right: 0° (right)
        if (!x_positive && y_positive) return Math.PI / 2 + params.offset; // Top left: 90° (up)
        if (!x_positive && !y_positive) return Math.PI + params.offset;  // Bottom left: 180° (left)
        return 3 * Math.PI / 2 + params.offset;                              // Bottom right: 270° (down)
    }
);

registerShader(
    "binary_grid",
    "Creates a simple binary checkerboard pattern ideal for very low resolution.",
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
    "Divides the space into discrete sectors for clear visual differentiation at low resolutions.",
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
    "Groups pixels into larger 'macro pixels' with consistent angles, ideal for very low resolution.",
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

function calculateAngles(points, rotationFormula, options = {}) {
    const {
        customCenter = null,
    } = options;

    const { cx, cy } = computeCentroid(points, customCenter);
    const distances = points.map(([label, x, y]) => Math.hypot(x - cx, y - cy));
    const maxDistance = distances.length ? Math.max(...distances) : 0;

    const result = [];
    for (let i = 0; i < points.length; i++) {
        const [label, x, y] = points[i];
        const dx = x - cx;
        const dy = y - cy;
        const dist = distances[i];

        let angleRad;
        const radialAngle = Math.atan2(dy, dx);
        angleRad = rotationFormula({
            radial_angle: radialAngle,
            radius: dist / maxDistance,
            dx: dx / maxDistance,
            dy: dy / maxDistance,
            label: label
        });
        let angleDeg = (angleRad * 180 / Math.PI) % 360;
        if (angleDeg < 0) angleDeg += 360;
        result.push({ label, x, y, angleDeg });
    }
    return result;
}


// Draw the rotated rectangles on the canvas.
function visualize(pointsWithAngles, options = {}) {
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');

    const bgColor = document.getElementById('background-color').value;

    // Clear the canvas.
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // For this demo, we define a fixed LED size (in “mm”) and a scale factor.
    // You can adjust these values or add unit conversion as needed.
    const scale = 10;  // 10 pixels per mm

    // Get the selected LED package and color
    const ledPackage = document.getElementById('led-package').value;
    const ledColor = document.getElementById('led-color').value;

    // Get LED dimensions based on package
    const [ledWidth, ledHeight] = getLedSize(ledPackage, Units.MM);

    const centerX = options.customCenter ? options.customCenter.x : null;
    const centerY = options.customCenter ? options.customCenter.y : null;
    const { cx, cy } = computeCentroid(points, { x: centerX, y: centerY });

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
    const centroidX = (cx - 20) * scale;
    const centroidY = (cy - 20) * scale;

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
        // Adjust point positions (here we subtract an offset to roughly center the design).
        const px = (x - 20) * scale;
        const py = (y - 20) * scale;
        const angleRad = angleDeg * Math.PI / 180;

        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(angleRad);
        // Draw a filled rectangle with a stroke.
        ctx.fillStyle = ledColor;
        ctx.strokeStyle = 'black';
        ctx.fillRect(- (ledWidth * scale) / 2, - (ledHeight * scale) / 2, ledWidth * scale, ledHeight * scale);
        ctx.strokeRect(- (ledWidth * scale) / 2, - (ledHeight * scale) / 2, ledWidth * scale, ledHeight * scale);

        // Add direction indicator
        ctx.beginPath();
        ctx.moveTo((ledWidth * scale) / 2, 0);
        ctx.lineTo((ledWidth * scale) / 2 + 3, 0);
        ctx.strokeStyle = '#e74c3c';
        ctx.stroke();

        ctx.restore();

        /*
        // Draw the label near the LED.
        ctx.save();
        ctx.translate(px, py);
        // Since text renders normally, flip the y-axis back.
        ctx.scale(1, -1);
        ctx.fillStyle = 'black';
        ctx.font = "10px Arial";
        ctx.textAlign = 'center';
        // don't show label
        ctx.fillText(label, 0, 0);
        ctx.restore();
        */
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

    select.dispatchEvent(new Event('change'));
}

function populateShaderParams() {
    const container = document.getElementById('shader-params-container');
    container.innerHTML = '';
    const shaderName = document.getElementById('shader-select').value;
    const shader = shaderRegistry[shaderName];

    // Add shader description if available
    if (shader?.desc) {
        const descDiv = document.createElement('div');
        descDiv.classList.add('param-description');
        descDiv.style.marginBottom = '15px';
        descDiv.textContent = shader.desc;
        container.appendChild(descDiv);
    }

    if (shader?.params) {
        shader.params.forEach(param => {
            const div = document.createElement('div');
            div.classList.add('control-item');

            const labelElem = document.createElement('label');
            labelElem.setAttribute('for', `param-${param.name}`);
            labelElem.textContent = param.name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

            const input = document.createElement('input');
            input.id = `param-${param.name}`;

            if (param.paramType === ParamTypes.BOOLEAN) {
                // Create a checkbox for boolean parameters
                input.type = 'checkbox';
                input.id = `param-${param.name}`;
                input.checked = param.defaultValue === true;
                input.style.width = 'auto';
                input.style.marginLeft = '10px';

                labelElem.classList.add('checkbox-label');

            } else if ((param.min !== null && param.max !== null) || param.paramType === ParamTypes.PERCENT || param.paramType === ParamTypes.ANGLE) {
                input.type = 'range';

                function formatValue(value, param) {
                    if (param.paramType === ParamTypes.ANGLE) {
                        // round to nearest 0.5 degrees
                        return Math.round(value * (180 / Math.PI) * 2) / 2 + '°';
                    } else if (param.step === 1 || param.paramType === ParamTypes.INTEGER) {
                        return parseInt(value);
                    } else if (param.paramType === ParamTypes.PERCENT) {
                        // round to nearest 0.5%
                        return Math.round(parseFloat(value) * 200) / 2 + '%';
                    } else {
                        return parseFloat(value).toFixed(2);
                    }
                }

                // Add value display for sliders
                const valueDisplay = document.createElement('span');
                valueDisplay.classList.add('value-display');
                valueDisplay.textContent = formatValue(param.defaultValue, param);
                valueDisplay.style.marginLeft = '8px';
                valueDisplay.style.fontSize = '0.9rem';

                input.addEventListener('input', () => {
                    valueDisplay.textContent = formatValue(input.value, param);
                });

                labelElem.appendChild(valueDisplay);
            } else {
                input.type = 'number';
            }

            if (param.min !== null) input.min = param.min;
            if (param.max !== null) input.max = param.max;

            if (param.step !== null) {
                input.step = param.step;
            } else if (param.paramType === ParamTypes.INTEGER) {
                input.step = 1;
            } else if (param.paramType === ParamTypes.PERCENT) {
                input.step = 0.05;
            }

            if (param.paramType === ParamTypes.PERCENT) {
                if (param.min === null) input.min = 0;
                if (param.max === null) input.max = 1;
            } else if (param.paramType === ParamTypes.ANGLE) {
                if (param.min === null) input.min = 0;
                if (param.max === null) input.max = 2 * Math.PI;
            }

            // MUST be set AFTER min/max/step, or else the browser may round the value!
            if (param.paramType !== ParamTypes.BOOLEAN) {
                input.value = param.defaultValue.toString();
            }

            div.appendChild(labelElem);
            div.appendChild(input);

            if (param.description) {
                const description = document.createElement('div');
                description.classList.add('param-description');
                description.textContent = param.description;
                div.appendChild(description);
            }

            container.appendChild(div);
        });
    }
}

let g_cachedAngles = [];

function updateVisualization() {
    const shaderName = document.getElementById('shader-select').value;
    const shader = shaderRegistry[shaderName];
    if (!shader) return;

    const shaderParams = {};
    if (shader.params) {
        shader.params.forEach(param => {
            const input = document.getElementById(`param-${param.name}`);

            if (param.paramType === ParamTypes.BOOLEAN) {
                shaderParams[param.name] = input?.checked || param.defaultValue;
            } else {
                shaderParams[param.name] = (input?.value !== undefined && input?.value !== '')
                    ? parseFloat(input.value)
                    : param.defaultValue;
            }
        });
    }

    const globalOptions = {
        customCenter: g_customCenter || null,
    };

    g_cachedAngles = calculateAngles(points,
        (args) => shader.fn(args, shaderParams),
        globalOptions
    );
    visualize(g_cachedAngles, globalOptions);
}


// 3. Modify the crosshair mode to update custom coordinates
let g_customCenter = null; // Store the custom center coordinates
let g_crosshairMode = false; // Flag to indicate crosshair mode


function initCentroidUI() {
    const canvas = document.getElementById('canvas');
    const setCenterBtn = document.getElementById('set-center-btn');
    const resetCenterBtn = document.getElementById('reset-center-btn');

    // Update UI to reflect current centroid status
    updateCentroidStatus();

    // Button click handler to activate crosshair mode
    setCenterBtn.addEventListener('click', () => {
        g_crosshairMode = true;
        canvas.style.cursor = 'crosshair';
        setCenterBtn.disabled = true;

        // Show notification
        showNotification('Click on the canvas to set center point, or press Esc to cancel', false, 'info');

        document.getElementById('centroid-status-instructions').style.display = 'block';
        document.getElementById('default-centroid-status').style.display = 'none';
        document.getElementById('custom-centroid-status').style.display = 'none';
    });

    // Canvas click handler to set the center point
    canvas.addEventListener('click', (e) => {
        if (!g_crosshairMode) return;

        // Get canvas position and dimensions
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        // Calculate clicked position in canvas coordinates
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;

        // Convert from canvas coordinates to our "mm" coordinates
        // canvas.width/2 center point, scale = 10, offset = 20
        const mmX = ((x - canvas.width / 2) / 10) + 20;
        const mmY = (((canvas.height - y) - canvas.height / 2) / 10) + 20;

        // Update our custom center
        g_customCenter = { x: mmX, y: mmY };

        // Provide user feedback
        showNotification(`Custom center set to X: ${mmX.toFixed(2)}, Y: ${mmY.toFixed(2)}`, false, 'success');

        // Update UI to reflect new centroid status
        updateCentroidStatus();

        // Update visualization
        updateVisualization();

        // Reset crosshair mode
        exitCrosshairMode();
    });

    // Reset center button handler
    resetCenterBtn.addEventListener('click', () => {
        g_customCenter = null;
        showNotification('Center reset to default (centroid of all points)', false, 'success');
        updateCentroidStatus();
        updateVisualization();
    });

    // Handle Escape key to cancel crosshair mode
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && g_crosshairMode) {
            exitCrosshairMode();
            showNotification('Center selection cancelled', false, 'info');
        }
    });
}

// Helper function to exit crosshair mode
function exitCrosshairMode() {
    g_crosshairMode = false;
    document.getElementById('set-center-btn').disabled = false;
    document.getElementById('canvas').style.cursor = 'default';
    document.getElementById('centroid-status-instructions').style.display = 'none';
    updateCentroidStatus();
}

function updateCentroidStatus() {
    const resetCenterBtn = document.getElementById('reset-center-btn');
    const defaultStatus = document.getElementById('default-centroid-status');
    const customStatus = document.getElementById('custom-centroid-status');

    // Update reset button state
    resetCenterBtn.disabled = g_customCenter === null;

    // Update status indicator
    if (g_customCenter) {
        // Update coordinate values
        document.getElementById('custom-center-x').textContent = g_customCenter.x.toFixed(2);
        document.getElementById('custom-center-y').textContent = g_customCenter.y.toFixed(2);

        // Show custom status, hide default status
        defaultStatus.style.display = 'none';
        customStatus.style.display = 'block';
    } else {
        // Show default status, hide custom status
        defaultStatus.style.display = 'block';
        customStatus.style.display = 'none';
    }
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
        globalOptions: {
            customCenter: g_customCenter || null,
        },
        // Points are already stored in localStorage, but include them for completeness
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
            const inputElem = document.getElementById(`param-${param.name}`);
            if (param.paramType === ParamTypes.BOOLEAN) {
                state.shaderParams[param.name] = inputElem?.checked || false;
            } else {
                state.shaderParams[param.name] = parseFloat(inputElem?.value) || param.defaultValue;
            }
        });
    }

    return state;
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
                    if (state.shaderParams.hasOwnProperty(param.name)) {
                        const inputElem = document.getElementById(`param-${param.name}`);
                        if (inputElem) {
                            if (param.paramType === ParamTypes.BOOLEAN) {
                                inputElem.checked = Boolean(state.shaderParams[param.name]);
                            } else {
                                inputElem.value = state.shaderParams[param.name];
                            }

                            // Trigger appropriate event for the input
                            // This will update any UI elements like value displays
                            const eventType = inputElem.type === 'range' ? 'input' : 'change';
                            inputElem.dispatchEvent(new Event(eventType));
                        }
                    }
                });
            }
        }

        // Set global options
        if (state.globalOptions) {
            // Restore custom center if it exists
            if (state.globalOptions.customCenter) {
                g_customCenter = state.globalOptions.customCenter;
            }
        }

        // Restore points if included
        if (state.points && Array.isArray(state.points) && state.points.length > 0) {
            points = state.points.map(p => [...p]); // Deep copy
            savePointsToCSV();
        }

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
    // Convert to JSON and encode for URL use
    const stateParam = encodeURIComponent(exportStateToJson(include_data));

    // Generate the full URL with the state parameter
    const url = new URL(window.location.href);
    url.searchParams.set('restore_state', stateParam);

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

    if (!stateParam) {
        return false;
    }

    try {
        // Decode and parse the state
        const urlState = JSON.parse(decodeURIComponent(stateParam));

        // Apply the state
        const success = deserializeState(urlState);

        if (success) {
            showNotification('Configuration loaded successfully!', false, 'success')

            // Clean up the URL after successful loading
            // This prevents accidental reloads from re-applying the state
            const url = new URL(window.location.href);
            url.searchParams.delete('restore_state');
            window.history.replaceState({}, document.title, url.toString());

            return true;
        } else {
            showNotification('Failed to load configuration', true, 'error');
        }
    } catch (error) {
        showNotification('Error to loading configuration', true, 'error');
        console.error('Error loading state from URL:', error);
    }

    return false;
}

// #region DOM init

document.addEventListener('DOMContentLoaded', () => {

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

    document.getElementById('import-cancel').addEventListener('click', () => {
        document.getElementById('import-modal').style.display = 'none';
    });

    document.getElementById('import-close').addEventListener('click', () => {
        document.getElementById('import-modal').style.display = 'none';
    });

    document.getElementById('export-close').addEventListener('click', () => {
        document.getElementById('export-modal').style.display = 'none';
    });

    document.getElementById('export-cancel').addEventListener('click', () => {
        document.getElementById('export-modal').style.display = 'none';
    });

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

    const collapsibleHeader = document.querySelector('.collapsible-header');
    const optionsGroup = document.getElementById('global-options-group');

    // Default to collapsed
    optionsGroup.classList.add('collapsed');

    // Toggle collapse state when header is clicked
    collapsibleHeader.addEventListener('click', () => {
        optionsGroup.classList.toggle('collapsed');
    });

    // 2. Add handlers for LED customization options
    document.getElementById('led-package').addEventListener('change', updateVisualization);
    document.getElementById('led-color').addEventListener('change', updateVisualization);
    document.getElementById('background-color').addEventListener('change', updateVisualization);

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

    initCentroidUI();

    // Initial population and visualization
    populateShaderSelect();

    loadStateFromUrl();

    updateVisualization();
});

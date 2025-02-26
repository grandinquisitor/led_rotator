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
        if (savedCSV) {
            points = parseCSV(savedCSV);
        } else {
            savePointsToCSV();
        }
    } catch (e) {
        console.error('Error loading points:', e);
        savePointsToCSV();
    }
})();

function parseCSV(csvText) {
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
        parsedPoints.push([label, x, y]);
    }
    if (parsedPoints.length === 0) throw new Error('CSV contains no valid data');
    return parsedPoints;
}

function savePointsToCSV() {
    const csv = points.map(p => p.join(',')).join('\n');
    localStorage.setItem('led-points-csv', csv);
}


// Shader registry implementation
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
    SHADER: new ParamType('SHADER', 'null', 'string', v => typeof v === 'string')
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

// Shader definitions

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
        p('scaling', ParamTypes.NUMBER, 5,
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
registerShader("radial", "Returns the original radial angle, effectively centering the rotation.",
    [],
    (args) => args.radial_angle);

// Centroid Rotation: Returns the unmodified radial angle.
registerShader("radial_offset", "Returns the original radial angle, effectively centering the rotation.",
    [p('offset', ParamTypes.ANGLE, 0, "Angular offset applied to the radial angle.",
        { min: 0, max: 2 * Math.PI, step: Math.PI / 180 }
    )],
    (args, params) => args.radial_angle + params.offset);

// Centroid Rotation: Returns the unmodified radial angle.
registerShader("radial_circle", "Returns the original radial angle, effectively centering the rotation.",
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
            { min: 0.1, max: 2, step: 0.1 })
    ],
    (args, params) => {
        const x_ratio = args.dx;
        const y_ratio = args.dy;
        return Math.atan2(
            2 * params.curvature * x_ratio * y_ratio,
            params.curvature * (x_ratio * x_ratio - y_ratio * y_ratio)
        );
    }
);

// Compute the centroid of the points.
function computeCentroid(points, centralObject = null) {
    if (centralObject) {
        for (let [label, x, y] of points) {
            if (label === centralObject) {
                return { cx: x, cy: y };
            }
        }
        throw new Error(`Central object ${centralObject} not found`);
    }
    let sumX = 0, sumY = 0;
    for (let [label, x, y] of points) {
        sumX += x;
        sumY += y;
    }
    return { cx: sumX / points.length, cy: sumY / points.length };
}

// Modified calculateAngles function with snake_case args
function calculateAngles(points, rotationFormula, options = {}) {
    const {
        centralObject = null,
        centerThreshold = 0.001,
        fixedCenterAngle = 0
    } = options;

    const { cx, cy } = computeCentroid(points, centralObject);
    const distances = points.map(([label, x, y]) => Math.hypot(x - cx, y - cy));
    const maxDistance = distances.length ? Math.max(...distances) : 0;

    const result = [];
    for (let i = 0; i < points.length; i++) {
        const [label, x, y] = points[i];
        const dx = x - cx;
        const dy = y - cy;
        const dist = distances[i];

        let angleRad;
        if (dist < centerThreshold) {
            angleRad = fixedCenterAngle * Math.PI / 180;
        } else {
            const radialAngle = Math.atan2(dy, dx);
            angleRad = rotationFormula({
                radial_angle: radialAngle,
                radius: dist / maxDistance,
                dx: dx,
                dy: dy,
                label: label
            });
        }
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

    // Clear the canvas.
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // For this demo, we define a fixed LED size (in “mm”) and a scale factor.
    // You can adjust these values or add unit conversion as needed.
    const scale = 10;  // 10 pixels per mm
    const ledWidth = 1.6;   // example: 0603 package width in mm
    const ledHeight = 0.8;  // example: 0603 package height in mm

    // For visualization, we translate the coordinate system:
    ctx.save();
    // Translate origin to the center of the canvas.
    ctx.translate(canvas.width / 2, canvas.height / 2);
    // Flip the y-axis so positive y goes up.
    ctx.scale(1, -1);

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
        ctx.fillStyle = 'blue';
        ctx.strokeStyle = 'black';
        ctx.fillRect(- (ledWidth * scale) / 2, - (ledHeight * scale) / 2, ledWidth * scale, ledHeight * scale);
        ctx.strokeRect(- (ledWidth * scale) / 2, - (ledHeight * scale) / 2, ledWidth * scale, ledHeight * scale);
        ctx.restore();

        // Draw the label near the LED.
        ctx.save();
        ctx.translate(px, py);
        // Since text renders normally, flip the y-axis back.
        ctx.scale(1, -1);
        ctx.fillStyle = 'black';
        ctx.font = "10px Arial";
        ctx.textAlign = 'center';
        // don't show label
        // ctx.fillText(label, 0, 0);
        ctx.restore();
    });

    ctx.restore();
}

// UI Management
function populateShaderSelect() {
    const select = document.getElementById('shader-select');
    const shaderNames = Object.keys(shaderRegistry);

    // Sort the shader names alphabetically
    shaderNames.sort();

    select.innerHTML = shaderNames
        .map(name => `<option value="${name}">${name}</option>`)
        .join('');

    select.dispatchEvent(new Event('change'));
}

function populateShaderParams() {
    const container = document.getElementById('shader-params-container');
    container.innerHTML = '';
    const shader = shaderRegistry[document.getElementById('shader-select').value];

    if (shader?.params) {
        shader.params.forEach(param => {
            const div = document.createElement('div');
            div.classList.add('param-container');

            const label = document.createElement('label');
            label.textContent = `${param.name}: `;

            const input = document.createElement('input');
            input.value = param.defaultValue;
            input.id = `param-${param.name}`;

            if ((param.min !== null && param.max !== null) || param.paramType === ParamTypes.PERCENT || param.paramType === ParamTypes.ANGLE) {
                input.type = 'range';
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
                input.step = .05;
            }

            if (param.paramType === ParamTypes.PERCENT) {
                if (param.min === null) input.min = 0;
                if (param.max === null) input.max = 1;
            } else if (param.paramType === ParamTypes.ANGLE) {
                if (param.min === null) input.min = 0;
                if (param.max === null) input.max = 2 * Math.PI;
            }

            div.appendChild(label);
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

function updateVisualization() {
    const shaderName = document.getElementById('shader-select').value;
    const shader = shaderRegistry[shaderName];
    if (!shader) return;

    const shaderParams = {};
    if (shader.params) {
        shader.params.forEach(param => {
            const input = document.getElementById(`param-${param.name}`);
            shaderParams[param.name] = parseFloat(input?.value) || param.defaultValue;
        });
    }

    const globalOptions = {
        centralObject: document.getElementById('global-central-object').value || null,
        centerThreshold: parseFloat(document.getElementById('global-center-threshold').value) || 0.001,
        fixedCenterAngle: parseFloat(document.getElementById('global-fixed-center-angle').value) || 0
    };

    const pointsWithAngles = calculateAngles(points,
        (args) => shader.fn(args, shaderParams),
        globalOptions
    );
    visualize(pointsWithAngles);
}

document.addEventListener('DOMContentLoaded', () => {

    // Modal handling
    document.getElementById('import-btn').addEventListener('click', () => {
        document.getElementById('import-csv-text').value = points.map(p => p.join(',')).join('\n');
        document.getElementById('import-error').textContent = '';
        document.getElementById('import-modal').style.display = 'flex';
    });

    document.getElementById('export-btn').addEventListener('click', () => {
        const shaderName = document.getElementById('shader-select').value;
        const shader = shaderRegistry[shaderName];
        if (!shader) return;

        const shaderParams = {};
        shader.params?.forEach(param => {
            const input = document.getElementById(`param-${param.name}`);
            shaderParams[param.name] = parseFloat(input?.value) || param.defaultValue;
        });

        const globalOptions = {
            centralObject: document.getElementById('global-central-object').value || null,
            centerThreshold: parseFloat(document.getElementById('global-center-threshold').value) || 0.001,
            fixedCenterAngle: parseFloat(document.getElementById('global-fixed-center-angle').value) || 0
        };

        const pointsWithAngles = calculateAngles(points,
            (args) => shader.fn(args, shaderParams),
            globalOptions
        );

        const csv = pointsWithAngles.map(p =>
            `${p.label},${p.angleDeg.toFixed(2)}`
        ).join('\n');

        document.getElementById('export-csv-text').value = csv;
        document.getElementById('export-modal').style.display = 'flex';
    });

    document.getElementById('import-submit').addEventListener('click', () => {
        try {
            const newPoints = parseCSV(document.getElementById('import-csv-text').value);
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

    document.getElementById('export-close').addEventListener('click', () => {
        document.getElementById('export-modal').style.display = 'none';
    });

    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });

    // Initial setup
    document.getElementById('shader-select').addEventListener('change', populateShaderParams);
    document.getElementById('controls').addEventListener('input', updateVisualization);
    populateShaderSelect();
    updateVisualization();
});
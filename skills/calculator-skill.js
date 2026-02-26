/**
 * Calculator Skill
 * 
 * Evaluate mathematical expressions and perform calculations.
 * Supports basic arithmetic, percentages, unit conversions, and more.
 */

export const skill = {
  manifest: {
    id: "calculator-skill",
    name: "Calculator",
    description: "Evaluate math expressions, percentages, and unit conversions",
    version: "1.0.0",
    author: "PowerHoof",
    permissions: ["read-context"],
    examples: [
      "/calc 2 + 2",
      "/math sqrt(16) * 2",
      "calculate 15% of 200",
      "/convert 100 miles to km"
    ],
    tags: ["math", "calculator", "utility", "conversion"]
  },

  async canHandle(context) {
    const content = context.message.content?.toLowerCase() || "";
    const triggers = [
      "/calc",
      "/calculate",
      "/math",
      "/convert",
      "calculate ",
      "what is ",
      "% of ",
      "how much is"
    ];
    return triggers.some(t => content.includes(t));
  },

  async execute(context) {
    const content = context.message.content || "";
    const lower = content.toLowerCase();

    // Check for unit conversion
    if (lower.includes("/convert") || lower.match(/\d+\s*\w+\s+to\s+\w+/)) {
      return this.convertUnits(content);
    }

    // Check for percentage calculation
    if (lower.includes("% of ")) {
      return this.calculatePercentage(content);
    }

    // Extract expression
    let expression = content
      .replace(/^\/?(?:calc|calculate|math)\s*/i, "")
      .replace(/^what is\s*/i, "")
      .replace(/^how much is\s*/i, "")
      .replace(/\?$/i, "")
      .trim();

    if (!expression) {
      return {
        success: true,
        content: this.getHelp(),
        nextAction: "respond"
      };
    }

    try {
      const result = this.evaluate(expression);
      return {
        success: true,
        content: `🧮 \`${expression}\` = **${this.formatNumber(result)}**`,
        data: { expression, result },
        nextAction: "respond"
      };
    } catch (error) {
      return {
        success: false,
        content: `🧮 Could not evaluate: ${expression}\n\nError: ${error.message}`,
        nextAction: "respond"
      };
    }
  },

  evaluate(expression) {
    // Replace common math functions
    let expr = expression
      .replace(/\^/g, "**")
      .replace(/sqrt\(/gi, "Math.sqrt(")
      .replace(/sin\(/gi, "Math.sin(")
      .replace(/cos\(/gi, "Math.cos(")
      .replace(/tan\(/gi, "Math.tan(")
      .replace(/log\(/gi, "Math.log10(")
      .replace(/ln\(/gi, "Math.log(")
      .replace(/abs\(/gi, "Math.abs(")
      .replace(/floor\(/gi, "Math.floor(")
      .replace(/ceil\(/gi, "Math.ceil(")
      .replace(/round\(/gi, "Math.round(")
      .replace(/pi/gi, "Math.PI")
      .replace(/e(?![a-z])/gi, "Math.E");

    // Security: Only allow safe characters
    if (!/^[\d\s+\-*/().%,Math.PIEsqrtincoalbogundefldecir]+$/i.test(expr)) {
      throw new Error("Invalid characters in expression");
    }

    // Evaluate using Function constructor (safer than eval for math)
    const result = new Function(`"use strict"; return (${expr})`)();
    
    if (typeof result !== "number" || !isFinite(result)) {
      throw new Error("Result is not a valid number");
    }

    return result;
  },

  calculatePercentage(content) {
    // Match patterns like "15% of 200", "calculate 20% of 50"
    const match = content.match(/([\d.]+)\s*%\s*of\s*([\d.]+)/i);
    
    if (!match) {
      return {
        success: false,
        content: "Usage: `calculate X% of Y` (e.g., `15% of 200`)",
        nextAction: "respond"
      };
    }

    const percent = parseFloat(match[1]);
    const value = parseFloat(match[2]);
    const result = (percent / 100) * value;

    return {
      success: true,
      content: `🧮 **${percent}%** of **${value}** = **${this.formatNumber(result)}**`,
      data: { percent, value, result },
      nextAction: "respond"
    };
  },

  convertUnits(content) {
    // Parse: /convert 100 miles to km
    const match = content.match(/([\d.]+)\s*(\w+)\s+to\s+(\w+)/i);
    
    if (!match) {
      return {
        success: false,
        content: "Usage: `/convert <value> <from> to <to>`\n\nExample: `/convert 100 miles to km`",
        nextAction: "respond"
      };
    }

    const [, valueStr, fromUnit, toUnit] = match;
    const value = parseFloat(valueStr);
    
    try {
      const result = this.convert(value, fromUnit.toLowerCase(), toUnit.toLowerCase());
      return {
        success: true,
        content: `📐 **${value} ${fromUnit}** = **${this.formatNumber(result)} ${toUnit}**`,
        data: { value, fromUnit, toUnit, result },
        nextAction: "respond"
      };
    } catch (error) {
      return {
        success: false,
        content: `Could not convert: ${error.message}\n\n${this.getSupportedUnits()}`,
        nextAction: "respond"
      };
    }
  },

  convert(value, from, to) {
    // Normalize unit names
    const normalize = (unit) => {
      const aliases = {
        // Length
        km: "kilometers", kilometer: "kilometers", kilometres: "kilometers",
        mi: "miles", mile: "miles",
        m: "meters", meter: "meters", metres: "meters",
        ft: "feet", foot: "feet",
        in: "inches", inch: "inches",
        cm: "centimeters", centimeter: "centimeters",
        mm: "millimeters", millimeter: "millimeters",
        yd: "yards", yard: "yards",
        // Weight
        kg: "kilograms", kilogram: "kilograms",
        lb: "pounds", lbs: "pounds", pound: "pounds",
        g: "grams", gram: "grams",
        oz: "ounces", ounce: "ounces",
        // Temperature
        c: "celsius", f: "fahrenheit", k: "kelvin",
        // Volume
        l: "liters", liter: "liters", litre: "liters", litres: "liters",
        gal: "gallons", gallon: "gallons",
        ml: "milliliters", milliliter: "milliliters",
        // Data
        b: "bytes", byte: "bytes",
        kb: "kilobytes", kilobyte: "kilobytes",
        mb: "megabytes", megabyte: "megabytes",
        gb: "gigabytes", gigabyte: "gigabytes",
        tb: "terabytes", terabyte: "terabytes"
      };
      return aliases[unit] || unit;
    };

    const fromNorm = normalize(from);
    const toNorm = normalize(to);

    // Conversion tables (to base unit)
    const conversions = {
      // Length (base: meters)
      length: {
        meters: 1,
        kilometers: 1000,
        miles: 1609.344,
        feet: 0.3048,
        inches: 0.0254,
        centimeters: 0.01,
        millimeters: 0.001,
        yards: 0.9144
      },
      // Weight (base: grams)
      weight: {
        grams: 1,
        kilograms: 1000,
        pounds: 453.592,
        ounces: 28.3495
      },
      // Volume (base: liters)
      volume: {
        liters: 1,
        milliliters: 0.001,
        gallons: 3.78541
      },
      // Data (base: bytes)
      data: {
        bytes: 1,
        kilobytes: 1024,
        megabytes: 1024 * 1024,
        gigabytes: 1024 * 1024 * 1024,
        terabytes: 1024 * 1024 * 1024 * 1024
      }
    };

    // Handle temperature separately (not linear conversion)
    if (["celsius", "fahrenheit", "kelvin"].includes(fromNorm)) {
      return this.convertTemperature(value, fromNorm, toNorm);
    }

    // Find the conversion category
    for (const [category, units] of Object.entries(conversions)) {
      if (units[fromNorm] !== undefined && units[toNorm] !== undefined) {
        const baseValue = value * units[fromNorm];
        return baseValue / units[toNorm];
      }
    }

    throw new Error(`Unknown conversion: ${from} to ${to}`);
  },

  convertTemperature(value, from, to) {
    // Convert to Celsius first
    let celsius;
    if (from === "celsius") celsius = value;
    else if (from === "fahrenheit") celsius = (value - 32) * 5/9;
    else if (from === "kelvin") celsius = value - 273.15;
    else throw new Error(`Unknown temperature unit: ${from}`);

    // Convert from Celsius to target
    if (to === "celsius") return celsius;
    if (to === "fahrenheit") return celsius * 9/5 + 32;
    if (to === "kelvin") return celsius + 273.15;
    throw new Error(`Unknown temperature unit: ${to}`);
  },

  formatNumber(num) {
    if (Number.isInteger(num)) return num.toString();
    // Round to 6 decimal places max
    return parseFloat(num.toFixed(6)).toString();
  },

  getSupportedUnits() {
    return `**Supported Units:**
• Length: km, miles, m, ft, in, cm, mm, yards
• Weight: kg, lb, g, oz
• Volume: L, mL, gal
• Temperature: C, F, K
• Data: B, KB, MB, GB, TB`;
  },

  getHelp() {
    return `🧮 **Calculator Skill**

**Commands:**
\`/calc <expression>\` - Evaluate math
\`/math <expression>\` - Alias for calc
\`/convert <value> <from> to <to>\` - Unit conversion

**Supported Operations:**
• Basic: \`+\`, \`-\`, \`*\`, \`/\`, \`^\` (power)
• Functions: \`sqrt()\`, \`sin()\`, \`cos()\`, \`log()\`, \`abs()\`
• Constants: \`pi\`, \`e\`
• Percentages: \`15% of 200\`

**Examples:**
• \`/calc 2 + 2 * 3\`
• \`/math sqrt(16) * 2\`
• \`/convert 100 miles to km\`
• \`calculate 15% of 200\`

${this.getSupportedUnits()}`;
  }
};

export default skill;

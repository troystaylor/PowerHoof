/**
 * Time Skill
 * 
 * Get current time in different timezones around the world.
 */

export const skill = {
  manifest: {
    id: "time-skill",
    name: "Time",
    description: "Get current time in different timezones",
    version: "1.0.0",
    author: "PowerHoof",
    permissions: ["read-context"],
    examples: [
      "time in Tokyo",
      "/time New York",
      "what time is it in London"
    ],
    tags: ["time", "timezone", "utility"]
  },

  async canHandle(context) {
    const content = context.message.content?.toLowerCase() || "";
    const triggers = [
      "/time",
      "/timezone",
      "/tz",
      "time in",
      "time for",
      "what time is it",
      "current time in"
    ];
    return triggers.some(t => content.includes(t));
  },

  async execute(context) {
    const content = context.message.content || "";
    
    // Extract location
    let location = content
      .replace(/^\/?(?:time|timezone|tz)\s*/i, "")
      .replace(/^(?:in|for)\s*/i, "")
      .replace(/^what time is it\s*/i, "")
      .replace(/^current time\s*/i, "")
      .trim();

    // Map common city names to timezones
    const timezoneMap = {
      // Americas
      "new york": "America/New_York",
      "nyc": "America/New_York",
      "los angeles": "America/Los_Angeles",
      "la": "America/Los_Angeles",
      "chicago": "America/Chicago",
      "denver": "America/Denver",
      "phoenix": "America/Phoenix",
      "seattle": "America/Los_Angeles",
      "san francisco": "America/Los_Angeles",
      "miami": "America/New_York",
      "boston": "America/New_York",
      "toronto": "America/Toronto",
      "vancouver": "America/Vancouver",
      "mexico city": "America/Mexico_City",
      "sao paulo": "America/Sao_Paulo",
      "buenos aires": "America/Argentina/Buenos_Aires",
      
      // Europe
      "london": "Europe/London",
      "paris": "Europe/Paris",
      "berlin": "Europe/Berlin",
      "rome": "Europe/Rome",
      "madrid": "Europe/Madrid",
      "amsterdam": "Europe/Amsterdam",
      "brussels": "Europe/Brussels",
      "vienna": "Europe/Vienna",
      "zurich": "Europe/Zurich",
      "stockholm": "Europe/Stockholm",
      "oslo": "Europe/Oslo",
      "copenhagen": "Europe/Copenhagen",
      "dublin": "Europe/Dublin",
      "prague": "Europe/Prague",
      "warsaw": "Europe/Warsaw",
      "athens": "Europe/Athens",
      "moscow": "Europe/Moscow",
      "istanbul": "Europe/Istanbul",
      
      // Asia
      "tokyo": "Asia/Tokyo",
      "osaka": "Asia/Tokyo",
      "beijing": "Asia/Shanghai",
      "shanghai": "Asia/Shanghai",
      "hong kong": "Asia/Hong_Kong",
      "singapore": "Asia/Singapore",
      "seoul": "Asia/Seoul",
      "taipei": "Asia/Taipei",
      "bangkok": "Asia/Bangkok",
      "mumbai": "Asia/Kolkata",
      "delhi": "Asia/Kolkata",
      "bangalore": "Asia/Kolkata",
      "dubai": "Asia/Dubai",
      "abu dhabi": "Asia/Dubai",
      "tel aviv": "Asia/Jerusalem",
      "jerusalem": "Asia/Jerusalem",
      "jakarta": "Asia/Jakarta",
      "kuala lumpur": "Asia/Kuala_Lumpur",
      "manila": "Asia/Manila",
      "hanoi": "Asia/Ho_Chi_Minh",
      "ho chi minh": "Asia/Ho_Chi_Minh",
      
      // Oceania
      "sydney": "Australia/Sydney",
      "melbourne": "Australia/Melbourne",
      "brisbane": "Australia/Brisbane",
      "perth": "Australia/Perth",
      "auckland": "Pacific/Auckland",
      "wellington": "Pacific/Auckland",
      
      // Africa
      "cairo": "Africa/Cairo",
      "johannesburg": "Africa/Johannesburg",
      "cape town": "Africa/Johannesburg",
      "nairobi": "Africa/Nairobi",
      "lagos": "Africa/Lagos",
      
      // Timezone abbreviations
      "pst": "America/Los_Angeles",
      "pdt": "America/Los_Angeles",
      "mst": "America/Denver",
      "mdt": "America/Denver",
      "cst": "America/Chicago",
      "cdt": "America/Chicago",
      "est": "America/New_York",
      "edt": "America/New_York",
      "gmt": "Europe/London",
      "utc": "UTC",
      "cet": "Europe/Paris",
      "jst": "Asia/Tokyo",
      "kst": "Asia/Seoul",
      "ist": "Asia/Kolkata",
      "aest": "Australia/Sydney",
      "aedt": "Australia/Sydney"
    };

    const locationLower = location.toLowerCase();
    const timezone = timezoneMap[locationLower];

    if (!timezone && !location) {
      // Show multiple timezones
      return {
        success: true,
        content: this.getMultipleTimezones(),
        nextAction: "respond"
      };
    }

    if (!timezone) {
      // Try to find partial match
      const partialMatch = Object.keys(timezoneMap).find(key => 
        key.includes(locationLower) || locationLower.includes(key)
      );
      
      if (partialMatch) {
        return {
          success: true,
          content: this.formatTime(timezoneMap[partialMatch], partialMatch),
          nextAction: "respond"
        };
      }
      
      return {
        success: true,
        content: `⚠️ **Unknown location: "${location}"**\n\nTry a major city like Tokyo, London, New York, or a timezone like PST, EST, UTC.`,
        nextAction: "respond"
      };
    }

    return {
      success: true,
      content: this.formatTime(timezone, location),
      nextAction: "respond"
    };
  },

  formatTime(timezone, locationName) {
    const now = new Date();
    
    const options = {
      timeZone: timezone,
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    };
    
    const formatter = new Intl.DateTimeFormat('en-US', options);
    const formatted = formatter.format(now);
    
    // Get timezone offset
    const offsetOptions = { timeZone: timezone, timeZoneName: 'short' };
    const offsetFormatter = new Intl.DateTimeFormat('en-US', offsetOptions);
    const parts = offsetFormatter.formatToParts(now);
    const tzAbbr = parts.find(p => p.type === 'timeZoneName')?.value || timezone;
    
    // Calculate offset from UTC
    const utcDate = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
    const localDate = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
    const offsetHours = (localDate - utcDate) / (1000 * 60 * 60);
    const offsetStr = offsetHours >= 0 ? `+${offsetHours}` : `${offsetHours}`;
    
    const displayName = locationName.charAt(0).toUpperCase() + locationName.slice(1);
    
    return `## 🕐 Time in ${displayName}

**${formatted}**

- **Timezone:** ${tzAbbr} (UTC${offsetStr})
- **24h format:** ${now.toLocaleTimeString('en-GB', { timeZone: timezone, hour: '2-digit', minute: '2-digit' })}`;
  },

  getMultipleTimezones() {
    const now = new Date();
    const zones = [
      { name: "🇺🇸 New York (EST)", tz: "America/New_York" },
      { name: "🇺🇸 Los Angeles (PST)", tz: "America/Los_Angeles" },
      { name: "🇬🇧 London (GMT)", tz: "Europe/London" },
      { name: "🇫🇷 Paris (CET)", tz: "Europe/Paris" },
      { name: "🇯🇵 Tokyo (JST)", tz: "Asia/Tokyo" },
      { name: "🇨🇳 Shanghai (CST)", tz: "Asia/Shanghai" },
      { name: "🇦🇺 Sydney (AEST)", tz: "Australia/Sydney" },
      { name: "🇮🇳 Mumbai (IST)", tz: "Asia/Kolkata" }
    ];

    let output = "## 🌍 World Clock\n\n";
    
    for (const zone of zones) {
      const time = now.toLocaleTimeString('en-US', { 
        timeZone: zone.tz, 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true
      });
      const date = now.toLocaleDateString('en-US', {
        timeZone: zone.tz,
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });
      output += `- ${zone.name}: **${time}** (${date})\n`;
    }
    
    output += "\n*Use `/time [city]` for specific location*";
    return output;
  }
};

export default skill;

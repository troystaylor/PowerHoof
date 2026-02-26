/**
 * Power BI Skill
 * DAX patterns, visualization best practices, and report design.
 */

export const skill = {
  manifest: {
    id: "power-bi-skill",
    name: "PowerBI",
    description: "Power BI assistant - DAX patterns, visualizations, report design",
    version: "1.0.0",
    author: "PowerHoof",
    permissions: ["read-context"],
    examples: [
      "/powerbi dax time intelligence",
      "/pbi visualization best practices",
      "/powerbi date table"
    ],
    tags: ["power-bi", "dax", "visualization", "reporting"]
  },

  knowledge: {
    dax: {
      timeIntelligence: {
        ytd: 'TOTALYTD([Measure], Dates[Date])',
        mtd: 'TOTALMTD([Measure], Dates[Date])',
        previousYear: 'CALCULATE([Measure], SAMEPERIODLASTYEAR(Dates[Date]))',
        yoyGrowth: 'DIVIDE([Current] - [Previous], [Previous])'
      },
      filterContext: {
        all: 'CALCULATE([Measure], ALL(Table))',
        allExcept: 'CALCULATE([Measure], ALLEXCEPT(Table, Table[Col]))',
        removeFilters: 'CALCULATE([Measure], REMOVEFILTERS(Table[Col]))'
      },
      iterators: ['SUMX', 'AVERAGEX', 'MAXX', 'MINX', 'COUNTX', 'RANKX'],
      dateTable: `DateTable = ADDCOLUMNS(CALENDAR(DATE(2020,1,1), DATE(2030,12,31)),
  "Year", YEAR([Date]), "Month", MONTH([Date]),
  "MonthName", FORMAT([Date], "MMMM"), "Quarter", "Q" & QUARTER([Date]))`
    },
    visuals: {
      types: ['Bar/Column', 'Line', 'Pie/Donut', 'Card', 'Table', 'Matrix', 'Scatter', 'Map', 'Treemap', 'Waterfall'],
      bestPractices: [
        'Bar charts for categorical comparisons',
        'Line charts for time series trends',
        'Cards for single KPI values',
        'Limit pie charts to 5-7 categories',
        'Most important visuals in top-left'
      ]
    }
  },

  async canHandle(context) {
    const content = context.message.content?.toLowerCase() || "";
    return ['/powerbi', '/pbi', 'power bi', 'dax formula', 'dax pattern'].some(t => content.includes(t));
  },

  async execute(context) {
    const content = context.message.content.toLowerCase();
    
    if (content.includes('date table') || content.includes('calendar')) {
      return { success: true, content: `**DAX Date Table:**\n\`\`\`dax\n${this.knowledge.dax.dateTable}\n\`\`\`` };
    }
    
    if (content.includes('time intelligence') || content.includes('ytd') || content.includes('yoy')) {
      const ti = this.knowledge.dax.timeIntelligence;
      return {
        success: true,
        content: `**Time Intelligence Patterns:**\n- YTD: \`${ti.ytd}\`\n- MTD: \`${ti.mtd}\`\n- Previous Year: \`${ti.previousYear}\`\n- YoY Growth: \`${ti.yoyGrowth}\``
      };
    }
    
    if (content.includes('visual') || content.includes('chart')) {
      return {
        success: true,
        content: `**Visualization Best Practices:**\n${this.knowledge.visuals.bestPractices.map(p => `- ${p}`).join('\n')}\n\n**Visual Types:** ${this.knowledge.visuals.types.join(', ')}`
      };
    }
    
    if (content.includes('filter') || content.includes('calculate')) {
      const fc = this.knowledge.dax.filterContext;
      return {
        success: true,
        content: `**Filter Context Modifiers:**\n- ALL: \`${fc.all}\`\n- ALLEXCEPT: \`${fc.allExcept}\`\n- REMOVEFILTERS: \`${fc.removeFilters}\``
      };
    }
    
    return {
      success: true,
      content: `**Power BI Assistant**\n\nI can help with:\n- DAX time intelligence patterns\n- Filter context modifiers\n- Date table creation\n- Visualization best practices\n\nTry: "/powerbi time intelligence" or "/pbi visual best practices"`
    };
  }
};

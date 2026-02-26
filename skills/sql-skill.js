/**
 * SQL Skill
 * T-SQL syntax, query optimization, and common patterns.
 */

export const skill = {
  manifest: {
    id: "sql-skill",
    name: "SQL",
    description: "SQL/T-SQL assistant - Query syntax, optimization, patterns",
    version: "1.0.0",
    author: "PowerHoof",
    permissions: ["read-context"],
    examples: [
      "/sql window function",
      "/tsql cte example",
      "/query pivot table"
    ],
    tags: ["sql", "t-sql", "database", "query", "optimization"]
  },

  knowledge: {
    windowFunctions: {
      ranking: ['ROW_NUMBER() OVER(ORDER BY col)', 'RANK() OVER(PARTITION BY cat ORDER BY val DESC)', 'DENSE_RANK()', 'NTILE(4)'],
      aggregate: ['SUM(amount) OVER(PARTITION BY customer)', 'AVG(price) OVER(ORDER BY date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW)'],
      offset: ['LAG(value, 1) OVER(ORDER BY date)', 'LEAD(value, 1) OVER(ORDER BY date)', 'FIRST_VALUE(col) OVER(...)', 'LAST_VALUE(col) OVER(...)']
    },
    cte: `WITH RankedSales AS (
  SELECT CustomerID, Amount,
    ROW_NUMBER() OVER(PARTITION BY CustomerID ORDER BY Amount DESC) as rn
  FROM Sales
)
SELECT * FROM RankedSales WHERE rn = 1;`,
    pivot: `SELECT * FROM (
  SELECT Year, Quarter, Revenue
  FROM Sales
) src
PIVOT (SUM(Revenue) FOR Quarter IN ([Q1],[Q2],[Q3],[Q4])) pvt;`,
    optimization: [
      'Use indexes on WHERE/JOIN columns',
      'Avoid SELECT * - specify columns',
      'Use EXISTS instead of IN for subqueries',
      'Avoid functions on indexed columns in WHERE',
      'Use SET NOCOUNT ON in procedures'
    ]
  },

  async canHandle(context) {
    const content = context.message.content?.toLowerCase() || "";
    return ['/sql', '/tsql', '/query', 'sql query', 't-sql'].some(t => content.includes(t));
  },

  async execute(context) {
    const content = context.message.content.toLowerCase();
    
    if (content.includes('window') || content.includes('row_number') || content.includes('rank')) {
      return {
        success: true,
        content: `**Window Functions:**\n\n**Ranking:** ${this.knowledge.windowFunctions.ranking.map(f => `\`${f}\``).join(', ')}\n\n**Aggregate:** ${this.knowledge.windowFunctions.aggregate.map(f => `\`${f}\``).join(', ')}\n\n**Offset:** ${this.knowledge.windowFunctions.offset.slice(0,2).map(f => `\`${f}\``).join(', ')}`
      };
    }
    
    if (content.includes('cte') || content.includes('with ') || content.includes('recursive')) {
      return { success: true, content: `**CTE (Common Table Expression):**\n\`\`\`sql\n${this.knowledge.cte}\n\`\`\`` };
    }
    
    if (content.includes('pivot') || content.includes('unpivot')) {
      return { success: true, content: `**PIVOT Example:**\n\`\`\`sql\n${this.knowledge.pivot}\n\`\`\`` };
    }
    
    if (content.includes('optim') || content.includes('performance') || content.includes('index')) {
      return {
        success: true,
        content: `**Query Optimization Tips:**\n${this.knowledge.optimization.map(t => `- ${t}`).join('\n')}`
      };
    }
    
    return {
      success: true,
      content: `**SQL Assistant**\n\n- Window functions (ROW_NUMBER, RANK, LAG/LEAD)\n- CTEs and recursive queries\n- PIVOT/UNPIVOT\n- Optimization tips\n\nTry: "/sql window function" or "/tsql cte example"`
    };
  }
};

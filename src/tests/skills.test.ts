/**
 * Unit Tests for Custom Skills
 * Tests the custom skills + help skill
 */

import { describe, it, expect, beforeEach } from "vitest";
import type { SkillContext } from "../skills/types.js";
import type { InboundMessage } from "../channels/types.js";

// Mock context factory
function createMockContext(message: string): SkillContext {
  const msg: InboundMessage = {
    id: "test-msg-1",
    channel: "rest",
    conversationId: "test-conv-1",
    sender: { id: "test-user", name: "Test User" },
    content: message,
    isGroup: false,
    mentioned: true,
    timestamp: new Date(),
  };
  
  const session = {
    id: "test-session-1",
    userId: "test-user",
    channel: "rest",
  };
  
  return { message: msg, session, history: [] };
}

describe("SQL Skill", () => {
  let skill: { canHandle: (ctx: SkillContext) => Promise<boolean>, execute: (ctx: SkillContext) => Promise<any> };
  
  beforeEach(async () => {
    const mod = await import("../../skills/sql-skill.js");
    skill = mod.skill;
  });

  it("should match /sql trigger", async () => {
    const ctx = createMockContext("/sql window function");
    expect(await skill.canHandle(ctx)).toBe(true);
  });

  it("should match /tsql trigger", async () => {
    const ctx = createMockContext("/tsql cte example");
    expect(await skill.canHandle(ctx)).toBe(true);
  });

  it("should not match unrelated messages", async () => {
    const ctx = createMockContext("what is javascript");
    expect(await skill.canHandle(ctx)).toBe(false);
  });

  it("should return window function info", async () => {
    const ctx = createMockContext("/sql window function");
    const result = await skill.execute(ctx);
    expect(result.success).toBe(true);
    expect(result.content).toContain("Window Functions");
    expect(result.content).toContain("ROW_NUMBER");
  });

  it("should return CTE info", async () => {
    const ctx = createMockContext("/sql cte recursive");
    const result = await skill.execute(ctx);
    expect(result.success).toBe(true);
    expect(result.content).toContain("CTE");
  });
});

describe("Regex Skill", () => {
  let skill: { canHandle: (ctx: SkillContext) => Promise<boolean>, execute: (ctx: SkillContext) => Promise<any> };
  
  beforeEach(async () => {
    const mod = await import("../../skills/regex-skill.js");
    skill = mod.skill;
  });

  it("should match /regex trigger", async () => {
    const ctx = createMockContext("/regex email pattern");
    expect(await skill.canHandle(ctx)).toBe(true);
  });

  it("should return email regex pattern", async () => {
    const ctx = createMockContext("/regex email");
    const result = await skill.execute(ctx);
    expect(result.success).toBe(true);
    expect(result.content).toContain("Email");
  });

  it("should return phone regex pattern", async () => {
    const ctx = createMockContext("/pattern phone number");
    const result = await skill.execute(ctx);
    expect(result.success).toBe(true);
    expect(result.content).toContain("Phone");
  });

  it("should return URL pattern", async () => {
    const ctx = createMockContext("/regex url");
    const result = await skill.execute(ctx);
    expect(result.success).toBe(true);
    expect(result.content).toContain("URL");
  });
});

describe("Dataverse Skill", () => {
  let skill: { canHandle: (ctx: SkillContext) => Promise<boolean>, execute: (ctx: SkillContext) => Promise<any> };
  
  beforeEach(async () => {
    const mod = await import("../../skills/dataverse-skill.js");
    skill = mod.skill;
  });

  it("should match /dataverse trigger", async () => {
    const ctx = createMockContext("/dataverse fetchxml");
    expect(await skill.canHandle(ctx)).toBe(true);
  });

  it("should match /fetchxml trigger", async () => {
    const ctx = createMockContext("/fetchxml join");
    expect(await skill.canHandle(ctx)).toBe(true);
  });

  it("should return FetchXML info", async () => {
    const ctx = createMockContext("/dataverse fetchxml");
    const result = await skill.execute(ctx);
    expect(result.success).toBe(true);
    expect(result.content).toContain("FetchXML");
  });

  it("should return Web API info", async () => {
    const ctx = createMockContext("/dv webapi");
    const result = await skill.execute(ctx);
    expect(result.success).toBe(true);
    expect(result.content).toContain("Web API");
  });
});

describe("Power BI Skill", () => {
  let skill: { canHandle: (ctx: SkillContext) => Promise<boolean>, execute: (ctx: SkillContext) => Promise<any> };
  
  beforeEach(async () => {
    const mod = await import("../../skills/power-bi-skill.js");
    skill = mod.skill;
  });

  it("should match /powerbi trigger", async () => {
    const ctx = createMockContext("/powerbi dax");
    expect(await skill.canHandle(ctx)).toBe(true);
  });

  it("should match /pbi trigger", async () => {
    const ctx = createMockContext("/pbi time intelligence");
    expect(await skill.canHandle(ctx)).toBe(true);
  });

  it("should return time intelligence info", async () => {
    const ctx = createMockContext("/powerbi ytd");
    const result = await skill.execute(ctx);
    expect(result.success).toBe(true);
    expect(result.content).toContain("Time Intelligence");
  });

  it("should return filter context info", async () => {
    const ctx = createMockContext("/pbi filter context");
    const result = await skill.execute(ctx);
    expect(result.success).toBe(true);
    expect(result.content).toContain("Filter Context");
  });
});

describe("Azure DevOps Skill", () => {
  let skill: { canHandle: (ctx: SkillContext) => Promise<boolean>, execute: (ctx: SkillContext) => Promise<any> };
  
  beforeEach(async () => {
    const mod = await import("../../skills/azure-devops-skill.js");
    skill = mod.skill;
  });

  it("should match /devops trigger", async () => {
    const ctx = createMockContext("/devops pipeline");
    expect(await skill.canHandle(ctx)).toBe(true);
  });

  it("should match /ado trigger", async () => {
    const ctx = createMockContext("/ado yaml");
    expect(await skill.canHandle(ctx)).toBe(true);
  });

  it("should return pipeline info", async () => {
    const ctx = createMockContext("/devops yaml pipeline");
    const result = await skill.execute(ctx);
    expect(result.success).toBe(true);
    expect(result.content).toContain("YAML");
  });

  it("should return WIQL info", async () => {
    const ctx = createMockContext("/ado wiql query");
    const result = await skill.execute(ctx);
    expect(result.success).toBe(true);
    expect(result.content).toContain("WIQL");
  });
});

describe("Logic Apps Skill", () => {
  let skill: { canHandle: (ctx: SkillContext) => Promise<boolean>, execute: (ctx: SkillContext) => Promise<any> };
  
  beforeEach(async () => {
    const mod = await import("../../skills/logic-apps-skill.js");
    skill = mod.skill;
  });

  it("should match /logicapps trigger", async () => {
    const ctx = createMockContext("/logicapps expression");
    expect(await skill.canHandle(ctx)).toBe(true);
  });

  it("should match /workflow trigger", async () => {
    const ctx = createMockContext("/workflow connector");
    expect(await skill.canHandle(ctx)).toBe(true);
  });

  it("should return expression info", async () => {
    const ctx = createMockContext("/logicapps expression");
    const result = await skill.execute(ctx);
    expect(result.success).toBe(true);
    expect(result.content).toContain("Expression");
  });

  it("should return connector info", async () => {
    const ctx = createMockContext("/workflow connectors");
    const result = await skill.execute(ctx);
    expect(result.success).toBe(true);
    expect(result.content).toContain("Connector");
  });
});

describe("Azure AI Skill", () => {
  let skill: { canHandle: (ctx: SkillContext) => Promise<boolean>, execute: (ctx: SkillContext) => Promise<any> };
  
  beforeEach(async () => {
    const mod = await import("../../skills/azure-ai-skill.js");
    skill = mod.skill;
  });

  it("should match /azureai trigger", async () => {
    const ctx = createMockContext("/azureai document intelligence");
    expect(await skill.canHandle(ctx)).toBe(true);
  });

  it("should match /docint trigger", async () => {
    const ctx = createMockContext("/docint extract");
    expect(await skill.canHandle(ctx)).toBe(true);
  });

  it("should return Document Intelligence info", async () => {
    const ctx = createMockContext("/azureai document intelligence");
    const result = await skill.execute(ctx);
    expect(result.success).toBe(true);
    expect(result.content).toContain("Document Intelligence");
  });

  it("should return Language Service info", async () => {
    const ctx = createMockContext("/azureai language sentiment");
    const result = await skill.execute(ctx);
    expect(result.success).toBe(true);
    expect(result.content).toContain("Language Service");
  });
});

describe("JSON Schema Skill", () => {
  let skill: { canHandle: (ctx: SkillContext) => Promise<boolean>, execute: (ctx: SkillContext) => Promise<any> };
  
  beforeEach(async () => {
    const mod = await import("../../skills/json-schema-skill.js");
    skill = mod.skill;
  });

  it("should match /jsonschema trigger", async () => {
    const ctx = createMockContext("/jsonschema array");
    expect(await skill.canHandle(ctx)).toBe(true);
  });

  it("should match /schema trigger", async () => {
    const ctx = createMockContext("/schema conditional");
    expect(await skill.canHandle(ctx)).toBe(true);
  });

  it("should return array schema info", async () => {
    const ctx = createMockContext("/jsonschema array");
    const result = await skill.execute(ctx);
    expect(result.success).toBe(true);
    expect(result.content).toContain("Array");
  });

  it("should return conditional schema info", async () => {
    const ctx = createMockContext("/schema if then");
    const result = await skill.execute(ctx);
    expect(result.success).toBe(true);
    expect(result.content).toContain("Conditional");
  });
});

describe("Power Pages Skill", () => {
  let skill: { canHandle: (ctx: SkillContext) => Promise<boolean>, execute: (ctx: SkillContext) => Promise<any> };
  
  beforeEach(async () => {
    const mod = await import("../../skills/power-pages-skill.js");
    skill = mod.skill;
  });

  it("should match /powerpages trigger", async () => {
    const ctx = createMockContext("/powerpages liquid");
    expect(await skill.canHandle(ctx)).toBe(true);
  });

  it("should match /liquid trigger", async () => {
    const ctx = createMockContext("/liquid for loop");
    expect(await skill.canHandle(ctx)).toBe(true);
  });

  it("should return Liquid template info", async () => {
    const ctx = createMockContext("/powerpages liquid");
    const result = await skill.execute(ctx);
    expect(result.success).toBe(true);
    expect(result.content).toContain("Liquid");
  });

  it("should return Web API info", async () => {
    const ctx = createMockContext("/portal webapi");
    const result = await skill.execute(ctx);
    expect(result.success).toBe(true);
    expect(result.content).toContain("Web API");
  });
});

describe("Help Skill", () => {
  let skill: { canHandle: (ctx: SkillContext) => Promise<boolean>, execute: (ctx: SkillContext) => Promise<any> };
  
  beforeEach(async () => {
    const mod = await import("../../skills/help-skill.js");
    skill = mod.skill;
  });

  it("should match /help trigger", async () => {
    const ctx = createMockContext("/help");
    expect(await skill.canHandle(ctx)).toBe(true);
  });

  it("should match /skills trigger", async () => {
    const ctx = createMockContext("/skills");
    expect(await skill.canHandle(ctx)).toBe(true);
  });

  it("should match 'what can you do' trigger", async () => {
    const ctx = createMockContext("what can you do");
    expect(await skill.canHandle(ctx)).toBe(true);
  });

  it("should return skill list", async () => {
    const ctx = createMockContext("/help");
    const result = await skill.execute(ctx);
    expect(result.success).toBe(true);
    expect(result.content).toContain("PowerHoof Skills");
    expect(result.content).toContain("/sql");
    expect(result.content).toContain("/powerbi");
  });
});

describe("Translate Skill", () => {
  let skill: { canHandle: (ctx: SkillContext) => Promise<boolean>, execute: (ctx: SkillContext) => Promise<any> };
  
  beforeEach(async () => {
    const mod = await import("../../skills/translate-skill.js");
    skill = mod.skill;
  });

  it("should match /translate trigger", async () => {
    const ctx = createMockContext("/translate hello to Spanish");
    expect(await skill.canHandle(ctx)).toBe(true);
  });

  it("should match /tr trigger", async () => {
    const ctx = createMockContext("/tr thank you to Japanese");
    expect(await skill.canHandle(ctx)).toBe(true);
  });

  it("should match natural language 'translate X to Y'", async () => {
    const ctx = createMockContext("translate goodbye to French");
    expect(await skill.canHandle(ctx)).toBe(true);
  });

  it("should match 'how do you say' trigger", async () => {
    const ctx = createMockContext("how do you say hello in German");
    expect(await skill.canHandle(ctx)).toBe(true);
  });

  it("should not match unrelated messages", async () => {
    const ctx = createMockContext("what is the weather");
    expect(await skill.canHandle(ctx)).toBe(false);
  });

  it("should translate hello to Spanish", async () => {
    const ctx = createMockContext("/translate hello to Spanish");
    const result = await skill.execute(ctx);
    expect(result.success).toBe(true);
    expect(result.content).toContain("hola");
  });

  it("should translate thank you to Japanese", async () => {
    const ctx = createMockContext("/tr thank you to Japanese");
    const result = await skill.execute(ctx);
    expect(result.success).toBe(true);
    expect(result.content).toContain("ありがとう");
  });

  it("should translate goodbye to German", async () => {
    const ctx = createMockContext("/translate goodbye to German");
    const result = await skill.execute(ctx);
    expect(result.success).toBe(true);
    expect(result.content).toContain("auf wiedersehen");
  });

  it("should handle unknown phrases gracefully", async () => {
    const ctx = createMockContext("/translate supercalifragilistic to Spanish");
    const result = await skill.execute(ctx);
    expect(result.success).toBe(true);
    // When phrase is unknown, shows available options
    expect(result.content).toContain("Common phrases");
  });
});

describe("Weather Skill", () => {
  let skill: { canHandle: (ctx: SkillContext) => Promise<boolean>, execute: (ctx: SkillContext) => Promise<any> };
  
  beforeEach(async () => {
    const mod = await import("../../skills/weather-skill.js");
    skill = mod.skill;
  });

  it("should match /weather trigger", async () => {
    const ctx = createMockContext("/weather Seattle");
    expect(await skill.canHandle(ctx)).toBe(true);
  });

  it("should match /forecast trigger", async () => {
    const ctx = createMockContext("/forecast New York");
    expect(await skill.canHandle(ctx)).toBe(true);
  });

  it("should match 'weather in' trigger", async () => {
    const ctx = createMockContext("weather in Tokyo");
    expect(await skill.canHandle(ctx)).toBe(true);
  });

  it("should match 'what's the weather' trigger", async () => {
    const ctx = createMockContext("what's the weather in Paris");
    expect(await skill.canHandle(ctx)).toBe(true);
  });

  it("should not match unrelated messages", async () => {
    const ctx = createMockContext("translate hello");
    expect(await skill.canHandle(ctx)).toBe(false);
  });
});

describe("Time Skill", () => {
  let skill: { canHandle: (ctx: SkillContext) => Promise<boolean>, execute: (ctx: SkillContext) => Promise<any> };
  
  beforeEach(async () => {
    const mod = await import("../../skills/time-skill.js");
    skill = mod.skill;
  });

  it("should match /time trigger", async () => {
    const ctx = createMockContext("/time Tokyo");
    expect(await skill.canHandle(ctx)).toBe(true);
  });

  it("should match /timezone trigger", async () => {
    const ctx = createMockContext("/timezone London");
    expect(await skill.canHandle(ctx)).toBe(true);
  });

  it("should match 'time in' trigger", async () => {
    const ctx = createMockContext("time in New York");
    expect(await skill.canHandle(ctx)).toBe(true);
  });

  it("should match 'what time is it' trigger", async () => {
    const ctx = createMockContext("what time is it in Paris");
    expect(await skill.canHandle(ctx)).toBe(true);
  });

  it("should not match unrelated messages", async () => {
    const ctx = createMockContext("weather in Seattle");
    expect(await skill.canHandle(ctx)).toBe(false);
  });

  it("should return time for Tokyo", async () => {
    const ctx = createMockContext("/time Tokyo");
    const result = await skill.execute(ctx);
    expect(result.success).toBe(true);
    expect(result.content).toContain("Tokyo");
  });
});

describe("Define Skill", () => {
  let skill: { canHandle: (ctx: SkillContext) => Promise<boolean>, execute: (ctx: SkillContext) => Promise<any> };
  
  beforeEach(async () => {
    const mod = await import("../../skills/define-skill.js");
    skill = mod.skill;
  });

  it("should match /define trigger", async () => {
    const ctx = createMockContext("/define ephemeral");
    expect(await skill.canHandle(ctx)).toBe(true);
  });

  it("should match /dict trigger", async () => {
    const ctx = createMockContext("/dict algorithm");
    expect(await skill.canHandle(ctx)).toBe(true);
  });

  it("should match 'define' trigger", async () => {
    const ctx = createMockContext("define recursion");
    expect(await skill.canHandle(ctx)).toBe(true);
  });

  it("should match 'what does X mean' trigger", async () => {
    const ctx = createMockContext("what does ephemeral mean");
    expect(await skill.canHandle(ctx)).toBe(true);
  });

  it("should not match unrelated messages", async () => {
    const ctx = createMockContext("weather in Seattle");
    expect(await skill.canHandle(ctx)).toBe(false);
  });
});

describe("Random Skill", () => {
  let skill: { canHandle: (ctx: SkillContext) => Promise<boolean>, execute: (ctx: SkillContext) => Promise<any> };
  
  beforeEach(async () => {
    const mod = await import("../../skills/random-skill.js");
    skill = mod.skill;
  });

  it("should match /random trigger", async () => {
    const ctx = createMockContext("/random quote");
    expect(await skill.canHandle(ctx)).toBe(true);
  });

  it("should match /quote trigger", async () => {
    const ctx = createMockContext("/quote");
    expect(await skill.canHandle(ctx)).toBe(true);
  });

  it("should match /fact trigger", async () => {
    const ctx = createMockContext("/fact");
    expect(await skill.canHandle(ctx)).toBe(true);
  });

  it("should match 'tell me a fact' trigger", async () => {
    const ctx = createMockContext("tell me a fact");
    expect(await skill.canHandle(ctx)).toBe(true);
  });

  it("should not match unrelated messages", async () => {
    const ctx = createMockContext("weather in Seattle");
    expect(await skill.canHandle(ctx)).toBe(false);
  });

  it("should return a quote", async () => {
    const ctx = createMockContext("/quote");
    const result = await skill.execute(ctx);
    expect(result.success).toBe(true);
    expect(result.content.length).toBeGreaterThan(10);
  });

  it("should return a fact", async () => {
    const ctx = createMockContext("/fact");
    const result = await skill.execute(ctx);
    expect(result.success).toBe(true);
    expect(result.content.length).toBeGreaterThan(10);
  });
});

describe("Remind Skill", () => {
  let skill: { canHandle: (ctx: SkillContext) => Promise<boolean>, execute: (ctx: SkillContext) => Promise<any> };
  
  beforeEach(async () => {
    const mod = await import("../../skills/remind-skill.js");
    skill = mod.skill;
  });

  it("should match /remind trigger", async () => {
    const ctx = createMockContext("/remind take a break in 10 minutes");
    expect(await skill.canHandle(ctx)).toBe(true);
  });

  it("should match 'remind me' trigger", async () => {
    const ctx = createMockContext("remind me to check email in 1 hour");
    expect(await skill.canHandle(ctx)).toBe(true);
  });

  it("should match /reminder trigger", async () => {
    const ctx = createMockContext("/reminder list");
    expect(await skill.canHandle(ctx)).toBe(true);
  });

  it("should not match unrelated messages", async () => {
    const ctx = createMockContext("weather in Seattle");
    expect(await skill.canHandle(ctx)).toBe(false);
  });

  it("should create a reminder", async () => {
    const ctx = createMockContext("/remind test reminder in 5 minutes");
    const result = await skill.execute(ctx);
    expect(result.success).toBe(true);
    expect(result.content).toContain("Reminder set");
  });

  it("should list reminders", async () => {
    const ctx = createMockContext("/remind list");
    const result = await skill.execute(ctx);
    expect(result.success).toBe(true);
  });
});

describe("Search Skill", () => {
  let skill: { canHandle: (ctx: SkillContext) => Promise<boolean>, execute: (ctx: SkillContext) => Promise<any> };
  
  beforeEach(async () => {
    const mod = await import("../../skills/search-skill.js");
    skill = mod.skill;
  });

  it("should match /search trigger", async () => {
    const ctx = createMockContext("/search nodejs event loop");
    expect(await skill.canHandle(ctx)).toBe(true);
  });

  it("should match /ddg trigger", async () => {
    const ctx = createMockContext("/ddg typescript decorators");
    expect(await skill.canHandle(ctx)).toBe(true);
  });

  it("should match 'search for' trigger", async () => {
    const ctx = createMockContext("search for react hooks");
    expect(await skill.canHandle(ctx)).toBe(true);
  });

  it("should match 'look up' trigger", async () => {
    const ctx = createMockContext("look up python generators");
    expect(await skill.canHandle(ctx)).toBe(true);
  });

  it("should not match unrelated messages", async () => {
    const ctx = createMockContext("weather in Seattle");
    expect(await skill.canHandle(ctx)).toBe(false);
  });
});

describe("News Skill", () => {
  let skill: { canHandle: (ctx: SkillContext) => Promise<boolean>, execute: (ctx: SkillContext) => Promise<any> };
  
  beforeEach(async () => {
    const mod = await import("../../skills/news-skill.js");
    skill = mod.skill;
  });

  it("should match /news trigger", async () => {
    const ctx = createMockContext("/news tech");
    expect(await skill.canHandle(ctx)).toBe(true);
  });

  it("should match /headlines trigger", async () => {
    const ctx = createMockContext("/headlines business");
    expect(await skill.canHandle(ctx)).toBe(true);
  });

  it("should match 'news about' trigger", async () => {
    const ctx = createMockContext("news about technology");
    expect(await skill.canHandle(ctx)).toBe(true);
  });

  it("should match 'latest news' trigger", async () => {
    const ctx = createMockContext("latest news");
    expect(await skill.canHandle(ctx)).toBe(true);
  });

  it("should not match unrelated messages", async () => {
    const ctx = createMockContext("weather in Seattle");
    expect(await skill.canHandle(ctx)).toBe(false);
  });
});

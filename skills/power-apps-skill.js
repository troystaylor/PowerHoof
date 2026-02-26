/**
 * Power Apps Skill
 * 
 * Reference guide for Power Apps canvas apps, controls, formulas, and patterns.
 * Covers canvas apps, model-driven apps, and component framework.
 */

export const skill = {
  manifest: {
    id: "power-apps-skill",
    name: "PowerApps",
    description: "Power Apps development assistant for canvas apps, formulas, and controls",
    version: "1.0.0",
    author: "PowerHoof",
    permissions: ["read-context"],
    examples: [
      "/powerapps Gallery",
      "/apps formula Filter",
      "/canvas controls",
      "how do I filter a gallery in Power Apps",
      "navigate between screens"
    ],
    tags: ["power-apps", "canvas-apps", "model-driven", "pcf", "controls", "formulas"]
  },

  // Control reference
  controls: {
    input: {
      "Text input": { props: "Default, HintText, OnChange", desc: "Text entry field" },
      "Dropdown": { props: "Items, Default, OnChange", desc: "Single-select dropdown" },
      "Combo box": { props: "Items, DefaultSelectedItems, SelectMultiple", desc: "Searchable multi-select" },
      "Date picker": { props: "DefaultDate, OnChange", desc: "Date selection" },
      "Slider": { props: "Min, Max, Default, OnChange", desc: "Numeric slider" },
      "Toggle": { props: "Default, OnCheck, OnUncheck", desc: "Boolean toggle switch" },
      "Radio": { props: "Items, Default, OnSelect", desc: "Radio button group" },
      "Checkbox": { props: "Default, OnCheck, OnUncheck", desc: "Boolean checkbox" },
      "Rating": { props: "Max, Default, OnChange", desc: "Star rating" },
      "Rich text editor": { props: "Default, OnChange", desc: "HTML text editor" },
      "Pen input": { props: "OnSelect", desc: "Signature/drawing capture" },
    },
    display: {
      "Label": { props: "Text, Font, Color", desc: "Display text" },
      "HTML text": { props: "HtmlText", desc: "Render HTML content" },
      "Image": { props: "Image, ImagePosition", desc: "Display images" },
      "Video": { props: "Media, AutoStart, Loop", desc: "Video player" },
      "Audio": { props: "Media, AutoStart, Loop", desc: "Audio player" },
      "PDF viewer": { props: "Document, Page", desc: "Display PDF files" },
      "Power BI tile": { props: "Workspace, Dashboard, Tile", desc: "Embed Power BI" },
    },
    layout: {
      "Gallery": { props: "Items, TemplateFill, OnSelect", desc: "Repeating data display" },
      "Data table": { props: "Items, SelectedItems", desc: "Tabular data view" },
      "Form": { props: "DataSource, Item, Mode", desc: "Edit/View records" },
      "Container": { props: "horizontal/vertical scroll", desc: "Group controls" },
      "Horizontal container": { props: "LayoutDirection, Gap", desc: "Flex row layout" },
      "Vertical container": { props: "LayoutDirection, Gap", desc: "Flex column layout" },
    },
    action: {
      "Button": { props: "Text, OnSelect", desc: "Click action trigger" },
      "Icon": { props: "Icon, OnSelect", desc: "Clickable icon" },
      "Timer": { props: "Duration, OnTimerEnd, AutoStart", desc: "Countdown/interval" },
    },
    media: {
      "Camera": { props: "StreamRate, OnStream", desc: "Camera capture" },
      "Barcode scanner": { props: "OnScan, BarcodeType", desc: "Scan barcodes/QR" },
      "Microphone": { props: "OnStop", desc: "Audio recording" },
    },
    ai: {
      "AI Builder form processor": { props: "FormModel", desc: "Document extraction" },
      "AI Builder object detector": { props: "ModelId", desc: "Object detection" },
      "AI Builder business card reader": { props: "OnScan", desc: "Business card OCR" },
    }
  },

  // Formula functions by category (extends Power Fx)
  formulas: {
    navigation: {
      Navigate: { syntax: "Navigate(Screen, Transition, Context)", desc: "Go to screen with optional context", example: "Navigate(DetailScreen, ScreenTransition.Fade, {SelectedItem: Gallery1.Selected})" },
      Back: { syntax: "Back()", desc: "Return to previous screen", example: "Back()" },
      Exit: { syntax: "Exit()", desc: "Close the app", example: "Exit()" },
      Launch: { syntax: "Launch(URL)", desc: "Open URL in browser", example: "Launch(\"https://microsoft.com\")" },
      Param: { syntax: "Param(\"paramname\")", desc: "Get URL parameter", example: "Param(\"recordId\")" },
    },
    data: {
      Collect: { syntax: "Collect(Collection, Record)", desc: "Add record to collection", example: "Collect(LocalData, {Name: TextInput1.Text})" },
      ClearCollect: { syntax: "ClearCollect(Collection, Records)", desc: "Clear and add records", example: "ClearCollect(AllProducts, Products)" },
      Patch: { syntax: "Patch(DataSource, Record, Changes)", desc: "Update or create record", example: "Patch(Employees, Defaults(Employees), {Name: \"John\"})" },
      Remove: { syntax: "Remove(DataSource, Record)", desc: "Delete record", example: "Remove(Employees, Gallery1.Selected)" },
      RemoveIf: { syntax: "RemoveIf(DataSource, Condition)", desc: "Delete matching records", example: "RemoveIf(Cache, Status = \"Expired\")" },
      Update: { syntax: "Update(DataSource, OldRecord, NewRecord)", desc: "Replace record", example: "Update(Products, LookUp(Products, ID=1), {ID:1, Name:\"New\"})" },
      UpdateIf: { syntax: "UpdateIf(DataSource, Condition, Changes)", desc: "Update matching records", example: "UpdateIf(Orders, Status = \"Pending\", {Status: \"Processing\"})" },
      SubmitForm: { syntax: "SubmitForm(FormName)", desc: "Save form data", example: "SubmitForm(EditForm1)" },
      ResetForm: { syntax: "ResetForm(FormName)", desc: "Reset form to defaults", example: "ResetForm(EditForm1)" },
      Refresh: { syntax: "Refresh(DataSource)", desc: "Reload data source", example: "Refresh(Products)" },
    },
    ui: {
      Set: { syntax: "Set(Variable, Value)", desc: "Set global variable", example: "Set(varUserName, User().FullName)" },
      UpdateContext: { syntax: "UpdateContext({Var: Value})", desc: "Set screen variable", example: "UpdateContext({showDialog: true})" },
      Reset: { syntax: "Reset(Control)", desc: "Reset control to default", example: "Reset(TextInput1)" },
      SetFocus: { syntax: "SetFocus(Control)", desc: "Move focus to control", example: "SetFocus(TextInput1)" },
      Select: { syntax: "Select(Control)", desc: "Trigger control's OnSelect", example: "Select(Button1)" },
      Notify: { syntax: "Notify(Message, Type)", desc: "Show notification banner", example: "Notify(\"Saved!\", NotificationType.Success)" },
      LoadData: { syntax: "LoadData(Collection, \"Key\")", desc: "Load from local storage", example: "LoadData(LocalCache, \"userdata\", true)" },
      SaveData: { syntax: "SaveData(Collection, \"Key\")", desc: "Save to local storage", example: "SaveData(LocalCache, \"userdata\")" },
    },
    connector: {
      "Office365Users.MyProfile": { syntax: "Office365Users.MyProfile()", desc: "Get current user profile" },
      "Office365Users.SearchUser": { syntax: "Office365Users.SearchUser({searchTerm: text})", desc: "Search AAD users" },
      "Office365Outlook.SendEmailV2": { syntax: "Office365Outlook.SendEmailV2(to, subject, body)", desc: "Send email" },
      "SharePoint.GetItems": { syntax: "SharePoint.GetItems(site, list)", desc: "Get SharePoint list items" },
      "Power Automate.Run": { syntax: "FlowName.Run(params)", desc: "Run Power Automate flow" },
    }
  },

  // Component patterns
  patterns: {
    masterDetail: {
      name: "Master-Detail Navigation",
      code: `// Gallery OnSelect
Navigate(DetailScreen, ScreenTransition.None, {SelectedRecord: ThisItem})

// DetailScreen - use context variable
DetailForm.Item: SelectedRecord`
    },
    searchFilter: {
      name: "Search and Filter Gallery",
      code: `// Gallery Items property
Filter(
    Products,
    StartsWith(Title, SearchBox.Text) &&
    (CategoryDropdown.Selected.Value = "All" || Category = CategoryDropdown.Selected.Value)
)`
    },
    formValidation: {
      name: "Form Validation",
      code: `// Submit button OnSelect
If(
    IsBlank(txtName.Text) || IsBlank(txtEmail.Text),
    Notify("Please fill all required fields", NotificationType.Error),
    SubmitForm(MainForm); Navigate(SuccessScreen)
)`
    },
    offlineData: {
      name: "Offline Data Pattern",
      code: `// App OnStart - load cached data
LoadData(LocalProducts, "products", true);
If(Connection.Connected, 
    ClearCollect(LocalProducts, Products);
    SaveData(LocalProducts, "products")
)

// Gallery Items
LocalProducts`
    },
    cascadingDropdown: {
      name: "Cascading Dropdowns",
      code: `// Country dropdown Items
Distinct(Locations, Country)

// City dropdown Items  
Filter(Locations, Country = CountryDropdown.Selected.Result).City`
    },
    errorHandling: {
      name: "Error Handling with IfError",
      code: `// Safe data operation
IfError(
    Patch(Customers, Defaults(Customers), {Name: txtName.Text}),
    Notify("Error saving: " & FirstError.Message, NotificationType.Error),
    Notify("Saved successfully!", NotificationType.Success)
)`
    },
    pagination: {
      name: "Gallery Pagination",
      code: `// Variables
Set(varPageSize, 20);
Set(varCurrentPage, 1);

// Gallery Items
FirstN(
    Skip(AllRecords, (varCurrentPage - 1) * varPageSize),
    varPageSize
)

// Next button: Set(varCurrentPage, varCurrentPage + 1)
// Previous button: Set(varCurrentPage, Max(1, varCurrentPage - 1))`
    }
  },

  // Responsive design
  responsive: {
    containers: `// Use containers for responsive layouts
App.Width: Max(App.MinScreenWidth, Parent.Width)
App.Height: Max(App.MinScreenHeight, Parent.Height)

// Horizontal container for row layout
Container.LayoutDirection: LayoutDirection.Horizontal
Container.LayoutAlignItems: LayoutAlignItems.Center
Container.LayoutGap: 10`,
    
    conditionalLayout: `// Show different layouts based on screen size
If(App.Width < 600, "Mobile", "Desktop")

// Gallery columns based on width
RoundDown(App.Width / 300, 0)`
  },

  async canHandle(context) {
    const content = context.message.content?.toLowerCase() || "";
    const triggers = [
      "/powerapps",
      "/apps",
      "/canvas",
      "power apps",
      "canvas app",
      "gallery formula",
      "navigate screen",
      "patch dataverse"
    ];
    return triggers.some(t => content.includes(t));
  },

  async execute(context) {
    const content = context.message.content || "";
    const lower = content.toLowerCase();

    // Controls
    if (lower.match(/control/)) {
      return this.showControls(lower);
    }

    // Formulas
    if (lower.match(/formula|function|navigate|patch|collect|filter/)) {
      return this.showFormulas(lower);
    }

    // Patterns
    if (lower.match(/pattern|master.*detail|search|filter.*gallery|validation|offline|dropdown|pagination/)) {
      return this.showPatterns(lower);
    }

    // Responsive
    if (lower.match(/responsive|container|layout|mobile/)) {
      return this.showResponsive();
    }

    // Control lookup
    const controlMatch = content.match(/(?:help|about|how|use)\s+(\w+\s?\w*)|^\/?(?:powerapps|apps|canvas)\s+(\w+)/i);
    if (controlMatch) {
      const name = (controlMatch[1] || controlMatch[2]).toLowerCase();
      return this.lookupControl(name);
    }

    return this.showHelp();
  },

  showControls(query) {
    let content = "## Power Apps Controls\n\n";
    
    const categories = {
      input: "Input Controls",
      display: "Display Controls",
      layout: "Layout Controls",
      action: "Action Controls",
      media: "Media Controls",
      ai: "AI Builder Controls"
    };

    for (const [key, title] of Object.entries(categories)) {
      if (query.includes(key) || query.includes(title.toLowerCase().split(" ")[0])) {
        content += `### ${title}\n\n| Control | Properties | Description |\n|---------|------------|-------------|\n`;
        for (const [name, info] of Object.entries(this.controls[key])) {
          content += `| **${name}** | ${info.props} | ${info.desc} |\n`;
        }
        return { success: true, content, nextAction: "respond" };
      }
    }

    // Show all categories
    for (const [key, title] of Object.entries(categories)) {
      content += `### ${title}\n`;
      for (const [name, info] of Object.entries(this.controls[key])) {
        content += `- **${name}** - ${info.desc}\n`;
      }
      content += "\n";
    }

    return { success: true, content, nextAction: "respond" };
  },

  showFormulas(query) {
    let content = "## Power Apps Formulas\n\n";
    
    const categories = {
      navigation: "Navigation",
      data: "Data Operations",
      ui: "UI & Variables",
      connector: "Connectors"
    };

    for (const [key, title] of Object.entries(categories)) {
      if (query.includes(key) || 
          (key === "navigation" && query.includes("navigate")) ||
          (key === "data" && (query.includes("patch") || query.includes("collect") || query.includes("filter")))) {
        content += `### ${title}\n\n`;
        for (const [name, info] of Object.entries(this.formulas[key])) {
          content += `#### ${name}\n`;
          content += `**Syntax:** \`${info.syntax}\`\n\n`;
          content += `${info.desc}\n\n`;
          if (info.example) {
            content += `\`\`\`\n${info.example}\n\`\`\`\n\n`;
          }
        }
        return { success: true, content, nextAction: "respond" };
      }
    }

    // Show summary
    for (const [key, title] of Object.entries(categories)) {
      content += `### ${title}\n`;
      for (const [name, info] of Object.entries(this.formulas[key])) {
        content += `- **${name}** - ${info.desc}\n`;
      }
      content += "\n";
    }

    return { success: true, content, nextAction: "respond" };
  },

  showPatterns(query) {
    let content = "## Power Apps Patterns\n\n";

    for (const [key, pattern] of Object.entries(this.patterns)) {
      if (query.includes(key.toLowerCase()) || 
          query.includes(pattern.name.toLowerCase().split(" ")[0])) {
        content += `### ${pattern.name}\n\n\`\`\`\n${pattern.code}\n\`\`\`\n`;
        return { success: true, content, nextAction: "respond" };
      }
    }

    // Show all patterns
    for (const [key, pattern] of Object.entries(this.patterns)) {
      content += `### ${pattern.name}\n\`\`\`\n${pattern.code}\n\`\`\`\n\n`;
    }

    return { success: true, content, nextAction: "respond" };
  },

  showResponsive() {
    return {
      success: true,
      content: `## Responsive Power Apps Design

### Using Containers
\`\`\`
${this.responsive.containers}
\`\`\`

### Conditional Layout
\`\`\`
${this.responsive.conditionalLayout}
\`\`\`

### Tips
- Use **Horizontal/Vertical containers** instead of absolute positioning
- Set **LayoutJustifyContent** for spacing (Start, Center, End, SpaceBetween)
- Use **LayoutAlignItems** for cross-axis alignment
- Set control **Width/Height** to relative values or "Parent.Width * 0.5"

📚 [Responsive Design Guide](https://learn.microsoft.com/power-apps/maker/canvas-apps/create-responsive-layout)`,
      nextAction: "respond"
    };
  },

  lookupControl(name) {
    for (const [category, controls] of Object.entries(this.controls)) {
      for (const [controlName, info] of Object.entries(controls)) {
        if (controlName.toLowerCase().includes(name)) {
          return {
            success: true,
            content: `## ${controlName}\n\n**Category:** ${category}\n\n**Key Properties:** ${info.props}\n\n**Description:** ${info.desc}\n\n📚 [Documentation](https://learn.microsoft.com/power-apps/maker/canvas-apps/controls/)`,
            nextAction: "respond"
          };
        }
      }
    }

    return {
      success: true,
      content: `No control found matching "${name}". Use \`/powerapps controls\` to see all controls.`,
      nextAction: "respond"
    };
  },

  showHelp() {
    return {
      success: true,
      content: `## Power Apps Assistant

Build canvas and model-driven apps with Power Apps.

### Commands

| Command | Description |
|---------|-------------|
| \`/powerapps controls\` | List all control types |
| \`/powerapps formulas\` | Formula reference |
| \`/powerapps patterns\` | Common app patterns |
| \`/powerapps responsive\` | Responsive design tips |
| \`/powerapps Gallery\` | Help with specific control |

### Quick Examples

**Filter Gallery:**
\`\`\`
Filter(Products, StartsWith(Name, SearchBox.Text))
\`\`\`

**Navigate with context:**
\`\`\`
Navigate(DetailScreen, ScreenTransition.None, {Item: Gallery1.Selected})
\`\`\`

**Save form:**
\`\`\`
SubmitForm(EditForm1); Navigate(SuccessScreen)
\`\`\`

📚 [Power Apps Docs](https://learn.microsoft.com/power-apps/)`,
      nextAction: "respond"
    };
  }
};

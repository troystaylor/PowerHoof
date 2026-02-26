# PowerHoof Custom Commands for Nushell
#
# These commands extend Nushell with PowerHoof-specific functionality
# for Azure operations, web access, and memory.

# Web request with structured output
def ph-web [
  url: string        # URL to fetch
  --method: string = "GET"  # HTTP method
  --body: string = ""       # Request body (for POST/PUT)
] {
  if $method == "GET" {
    http get $url | from json
  } else if $method == "POST" {
    http post $url $body | from json
  } else {
    error make { msg: $"Unsupported method: ($method)" }
  }
}

# Read file with automatic format detection
def ph-file [
  path: string  # File path to read
] {
  let ext = ($path | path parse | get extension)
  
  match $ext {
    "json" => { open $path | from json }
    "csv" => { open $path | from csv }
    "toml" => { open $path | from toml }
    "yaml" | "yml" => { open $path | from yaml }
    _ => { open $path }
  }
}

# Azure resource query using Azure CLI
def ph-azure [
  query: string  # JMESPath query for Azure resources
  --subscription: string = ""  # Subscription ID (optional)
] {
  if ($subscription | is-empty) {
    az resource list --query $query -o json | from json
  } else {
    az resource list --subscription $subscription --query $query -o json | from json
  }
}

# Store a memo to memory
def ph-memo [
  title: string    # Memo title
  content: string  # Memo content
  --tags: list<string> = []  # Optional tags
] {
  let memo_api = $env.POWERHOOF_API? | default "http://localhost:3000"
  let user_id = $env.POWERHOOF_USER? | default "default"
  
  let body = {
    userId: $user_id
    title: $title
    content: $content
    tags: $tags
  } | to json
  
  http post $"($memo_api)/memos" $body -H ["Content-Type" "application/json"]
}

# Recall memos from memory
def ph-recall [
  query: string = ""  # Search query (optional)
  --limit: int = 10   # Maximum results
] {
  let memo_api = $env.POWERHOOF_API? | default "http://localhost:3000"
  let user_id = $env.POWERHOOF_USER? | default "default"
  
  let url = if ($query | is-empty) {
    $"($memo_api)/memos/($user_id)?limit=($limit)"
  } else {
    $"($memo_api)/memos/($user_id)?q=($query | url encode)&limit=($limit)"
  }
  
  http get $url | get memos
}

# Web search using DuckDuckGo (structured)
def ph-search [
  query: string  # Search query
  --limit: int = 5
] {
  # Use DuckDuckGo instant answer API
  let url = $"https://api.duckduckgo.com/?q=($query | url encode)&format=json"
  let result = http get $url | from json
  
  # Extract results
  $result.RelatedTopics | first $limit | each { |topic|
    {
      text: $topic.Text?
      url: $topic.FirstURL?
    }
  } | compact
}

# Get calendar/datetime info
def ph-calendar [
  --format: string = "date"  # date, time, datetime, week, month
] {
  match $format {
    "date" => { date now | format date "%Y-%m-%d" }
    "time" => { date now | format date "%H:%M:%S" }
    "datetime" => { date now | format date "%Y-%m-%d %H:%M:%S" }
    "week" => { date now | format date "%Y-W%V" }
    "month" => { date now | format date "%Y-%m" }
    _ => { date now }
  }
}

# Code execution result formatter
def ph-result [
  data: any           # Data to format
  --format: string = "auto"  # auto, json, table, csv
] {
  match $format {
    "json" => { $data | to json }
    "table" => { $data | table }
    "csv" => { $data | to csv }
    "auto" => {
      if ($data | describe | str starts-with "list") {
        $data | table
      } else if ($data | describe | str starts-with "record") {
        $data | to json
      } else {
        $data
      }
    }
    _ => { $data }
  }
}

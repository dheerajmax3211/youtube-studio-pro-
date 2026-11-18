// global fetch is native in Node 18+

const apiKey = process.env.OPENROUTER_API_KEY || '';
const topic = 'Explain Kubernetes architecture and how it works';
const durationSeconds = 60;

const prompt = `You are a world-class creator & engineering video director (specialized in viral high-retention technical explainers like Fireship, Veritasium, and Vox).
Topic: "${topic}"
Target Duration: ${durationSeconds} seconds (approximately ${Math.round(durationSeconds * 2.3)} spoken words).

DETECT TOPIC GENRE:
Is this topic technical, software, cloud, devops, architecture, engineering, coding, or an informative "how it works" deep dive?
YES. For any technical / engineering / software / explainer topic, you are STRICTLY FORBIDDEN from generating generic marketing slogans or text boxes.
The viewer demands to see REAL ARCHITECTURE, REAL CODE/YAML, REAL TERMINAL CLI COMMANDS, and REAL SYSTEM FLOWS.

CRITICAL DIRECTIVES:
1. Tailor EVERYTHING specifically to "${topic}". Speak like a senior principal architect explaining clearly to an ambitious developer.
2. Structure narration into 3 to 5 spoken paragraphs. High retention hook, architectural breakdown, mechanics of how it works under the hood, and closing takeaway.
3. Create 8 to 14 dynamic visual BEATS (3 to 6 seconds each) in strictly chronological order.
4. CRITICAL SYNCHRONIZATION REQUIREMENT:
   Every beat MUST include an "anchor_phrase" property containing an EXACT 2 to 5 word phrase taken verbatim from your "paragraphs" text that triggers this visual card when spoken.
5. CHOOSE THE RIGHT ARCHETYPES FOR THIS TOPIC:
   For technical/coding/engineering topics, AT LEAST 70% of the beats MUST use these specialized technical archetypes:

   - 'architecture_diagram': System topology and components.
     Schema: {
       "anchor_phrase": "string",
       "type": "architecture_diagram",
       "eyebrow": "CLUSTER ARCHITECTURE",
       "title": "Control Plane & Worker Nodes",
       "control_plane": {
         "title": "Control Plane (Master)",
         "components": [
           { "name": "API Server", "role": "Cluster Gateway & REST API" },
           { "name": "etcd", "role": "Distributed Key-Value Store" },
           { "name": "Kube-Scheduler", "role": "Pod Placement Engine" },
           { "name": "Controller Mgr", "role": "State Reconciliation" }
         ]
       },
       "worker_nodes": [
         { "node_name": "Worker Node 01", "kubelet": "Active", "pods": ["nginx-pod-a", "api-pod-b"] },
         { "node_name": "Worker Node 02", "kubelet": "Active", "pods": ["api-pod-c", "db-pod-d"] }
       ],
       "flow_label": "Bi-directional TLS telemetry & scheduling directives"
     }

   - 'code_snippet': Real syntax-highlighted manifest or code.
     Schema: {
       "anchor_phrase": "string",
       "type": "code_snippet",
       "eyebrow": "DECLARATIVE MANIFEST",
       "filename": "deployment.yaml",
       "language": "yaml",
       "highlight_line": 5,
       "lines": [
         { "num": "01", "text": "apiVersion: apps/v1" },
         { "num": "02", "text": "kind: Deployment" },
         { "num": "03", "text": "metadata:" },
         { "num": "04", "text": "  name: web-api" },
         { "num": "05", "text": "spec:" },
         { "num": "06", "text": "  replicas: 3", "highlight": true, "note": "Desired State" },
         { "num": "07", "text": "  template:" },
         { "num": "08", "text": "    spec: containers: [{name: api, image: app:v2}]" }
       ]
     }

   - 'terminal_execution': macOS / Linux terminal with real CLI commands and output.
     Schema: {
       "anchor_phrase": "string",
       "type": "terminal_execution",
       "eyebrow": "TERMINAL EXECUTION",
       "command": "kubectl apply -f deployment.yaml && kubectl get pods",
       "outputs": [
         { "type": "info", "text": "deployment.apps/web-api created" },
         { "type": "header", "text": "NAME         READY   STATUS    RESTARTS   AGE" },
         { "type": "row", "name": "web-api-1", "ready": "1/1", "status": "Running", "ip": "10.244.0.12" },
         { "type": "row", "name": "web-api-2", "ready": "1/1", "status": "Running", "ip": "10.244.1.4" },
         { "type": "row", "name": "web-api-3", "ready": "1/1", "status": "Running", "ip": "10.244.2.8" },
         { "type": "success", "text": "✓ 3/3 Replicas Healthy & Distributed" }
       ]
     }

   - 'system_flow': End-to-end request or data pipeline.
     Schema: {
       "anchor_phrase": "string",
       "type": "system_flow",
       "eyebrow": "REQUEST LIFECYCLE",
       "title": "From Ingress to Container",
       "steps": [
         { "step": "01", "name": "Client Request", "desc": "HTTPS Traffic arrives at Cluster IP" },
         { "step": "02", "name": "Ingress Controller", "desc": "TLS termination and URL path routing" },
         { "step": "03", "name": "Kube-Proxy", "desc": "IPtables load balancing across pods" },
         { "step": "04", "name": "Target Pod", "desc": "Container handles request & returns JSON" }
       ]
     }

   - 'mechanism_inspect': Deep dive into auto-healing or reconciliation logic.
     Schema: {
       "anchor_phrase": "string",
       "type": "mechanism_inspect",
       "eyebrow": "THE RECONCILIATION LOOP",
       "title": "Continuous State Convergence",
       "desired_state": "3 Replicas Running",
       "detected_event": "Node 02 Out of Memory (Pod 3 Died)",
       "controller_action": "Controller schedules Pod 4 on Node 01",
       "final_state": "Cluster restored to 3/3 within 120ms"
     }

   Other formats also available when appropriate: 'split_contrast', 'stat_hero', 'data_grid', 'roadmap_checklist'.
6. Choose visual theme preset: 'emerald_tech' or 'cyber_violet' or 'studio_frost' for tech topics.
7. Choose BGM mood: 'cyber_synth' or 'lofi_chill' or 'cinematic_epic'.

Return ONLY valid JSON matching this exact structure:
{
  "title": "Short Punchy Title",
  "tagline": "UPPERCASE CATEGORY OR HOOK",
  "bgm_mood": "cyber_synth",
  "theme_preset": "emerald_tech",
  "paragraphs": [
    "Paragraph 1...",
    "Paragraph 2...",
    "Paragraph 3...",
    "Paragraph 4..."
  ],
  "beats": [
    { ... }
  ]
}`;

async function test() {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://youtube-studio-pro.local',
      'X-Title': 'YouTube Studio Pro'
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' }
    })
  });

  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content || '{}';
  console.log('LLM Result:');
  console.log(raw);
}

test();

import { addNodeToMap } from './visualizer.js';

/**
 * Bulk loads historical intelligence from Sparky's Brain
 * to populate the visualizers.
 */
export async function syncHistoricalIntelligence() {
  console.log("[SPARKY] Syncing historical intelligence for Neural Map...");
  try {
    const response = await fetch('http://192.168.0.176:3000/api/intelligence');
    const data = await response.json();
    
    data.forEach(node => {
      // Add show node
      const isV4V = node.baseline_score > 0;
      addNodeToMap(node.title, false, isV4V);
      
      // Extract guests and add them as connections
      if (node.connections) {
        const connections = JSON.parse(node.connections);
        connections.forEach(person => {
          if (person.type === 'PERSON') {
            addNodeToMap(person.name, true);
          }
        });
      }
    });
    
    console.log(`[SPARKY] Sync Complete. ${data.length} historical shows injected into the Web.`);
  } catch (err) {
    console.error("[SPARKY] Sync failed. Ensure Brain API is online on Sparky.", err);
  }
}

// main.ts
import { createApp } from "vue"
import VNetworkGraph from "v-network-graph"
import "v-network-graph/lib/style.css"
import App from "./App.vue"

import ElementPlus from "element-plus";
import "element-plus/dist/index.css";  // 导入样式

const app = createApp(App)
app.use(ElementPlus); 
app.use(VNetworkGraph)
app.mount("#app")
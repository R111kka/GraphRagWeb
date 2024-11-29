<script setup lang="ts">
import { reactive, ref, computed, watch, onBeforeUnmount,onMounted } from "vue";
import * as vNG from "v-network-graph";
import { ForceLayout } from "v-network-graph/lib/force-layout";
import axios from "axios";

// 引入 JSON 数据
//import graphData from "./assets/graph_data.json";

// 类型定义
interface Layouts {
  nodes: { [key: string]: { x: number; y: number; color?: string } }; // 添加 color 属性
}
interface Nodes {
  [key: string]: { name: string; description: string; label: string; color?: string; };
}
interface Edges {
  [key: string]: { source: string; target: string; width: string; description: string; label: string; id: string };
}
// 使用空对象初始化节点、边和布局
const nodes = reactive<Nodes>({});
const edges = reactive<Edges>({});
const layouts = reactive<Layouts>({ nodes: {} });
// 控制面板显示的节点和边的数量
const nodeCount = ref(0);
const edgeCount = ref(0);
// 获取图数据的函数
const fetchGraphData = async () => {
  try {
    const response = await axios.get('/api/jsonfile/'); // 从后端获取图数据
    const graphData = response.data;

    // 更新节点、边和布局数据
    Object.assign(nodes, graphData.nodes);
    Object.assign(edges, graphData.edges);
    Object.assign(layouts, graphData.layouts);

    // 转换边数据为基于 source-target 的索引
    Object.values(graphData.edges).forEach((edge: any) => {
      const key = edge.key;
      edges[key] = `${edge.source}-${edge.target}`;
    });

    // 调用函数初始化颜色
    addColorToNodes();

    // 更新节点和边的数量
    nodeCount.value = Object.keys(nodes).length;
    edgeCount.value = Object.keys(edges).length;

  } catch (error) {
    console.error("获取图数据时出错:", error);
  }
};
onMounted(() => {
  fetchGraphData();
});

// show info
const targetNodeId = ref<string>("");
const tooltipOpacity = ref(0);

// max_tokens滑动框的值
const maxTokens = ref<number>(100);

// 使用从JSON数据导入的节点、边和布局
//const nodes = reactive<Nodes>(graphData.nodes);
//const edges = reactive<Edges>({});
//const layouts = reactive<Layouts>(graphData.layouts);

// 转换边数据为基于source-target的索引
//Object.values(graphData.edges).forEach((edge: any) => {
//  const key = `${edge.source}-${edge.target}`;
//  edges[key] = edge;
//});

// 控制面板显示的节点和边的数量
//const nodeCount = ref(Object.keys(nodes).length);
//const edgeCount = ref(Object.keys(edges).length);

const addColorToNodes = () => {
  Object.keys(nodes).forEach((nodeKey) => {
    // 动态为每个节点添加默认颜色
    if (!nodes[nodeKey].hasOwnProperty('color')) {
      nodes[nodeKey].color = "#4466cc";
    }
  });
};



// 配置视图的初始布局
const layoutHandler: vNG.LayoutHandler = new ForceLayout({
  positionFixedByDrag: false,
  positionFixedByClickWithAltKey: true,
  createSimulation: (d3, nodes, edges) => {
    const forceLink = d3.forceLink(edges).id((d) => d.id);
    return d3
    .forceSimulation(nodes)
    .force("link", forceLink.distance(200).strength(0.5))
    .force("charge", d3.forceManyBody().strength(-200))
    .force("center", d3.forceCenter().strength(1))
    .alphaDecay(0.05)
    .alphaMin(0.005);
  },
});

// 动态设置布局的计算属性
const d3ForceEnabled = computed({
  get: () => configs.view?.layoutHandler instanceof ForceLayout,
  set: (value: boolean) => {
    configs.view.layoutHandler = value
    ? layoutHandler
      : new vNG.SimpleLayout();
  },
});

// 配置视图
const configs = reactive(
  vNG.defineConfigs({
    view: {
      layoutHandler: layoutHandler,
      scalingObjects: true,
    },
    node: {
      normal: {
        type: "circle",
        radius: 16,
        width: 32,
        height: 32,
        borderRadius: 4,
        strokeWidth: 0,
        strokeColor: "#000000",
        strokeDasharray: "0",
        color: node => node.color,
      },
      label: {
        visible: true,
        fontFamily: undefined,
        fontSize: 11,
        lineHeight: 1.1,
        color: "#000000",
        margin: 4,
        direction: "south",
        text: "name",
      },
    },
    edge: {
      normal: {
        width: (edge) => {
          const widthValue = parseFloat(edge.width) || 1;
          return widthValue / 2;
        },
        dasharray: (edge) => (edge.dashed? "4" : "0"),
      },
      marker: {
        source: {
          type: "none",
          width: 4,
        height: 4,
          margin: -1,
          offset: 0,
          units: "strokeWidth",
          color: null,
        },
        target: {
          type: "arrow",
          width: 3.5,
          height: 3,
          margin: -0.1,
          offset: 0,
          units: "strokeWidth",
          zIndex: -1,
        },
      },
    },
  })
);

// 监听空格键按下事件，获取“教育部”节点位置并改变颜色
const getPositionOnSpacebarPress = () => {
  const handleKeydown = (event: KeyboardEvent) => {
    if (event.code === 'Space') {
      const node = layouts.nodes["教育部"];
      console.log(`教育部位置：x = ${node.x}, y = ${node.y}`);

      // 修改“教育部”节点的颜色为绿色
      if (node) {
        nodes["直立人"].color = "green";
      }
    }
  };

  // 添加事件监听器
  window.addEventListener("keydown", handleKeydown);

  // 清理事件监听器
  onBeforeUnmount(() => {
    window.removeEventListener("keydown", handleKeydown);
  });
};

// 调用函数以启用监听
getPositionOnSpacebarPress();

// Tooltip监听
const eventHandlers: vNG.EventHandlers = {
  "node:pointerover": ({ node }) => {
    targetNodeId.value = node;
    tooltipOpacity.value = 1;
  },
  "node:pointerout": _ => {
    tooltipOpacity.value = 0;
  },
  "edge:pointerover": ({ edge }) => {
    targetNodeId.value = edge?? ""
    tooltipOpacity.value = 2;
  },
  "edge:pointerout": _ => {
    tooltipOpacity.value = 0;
  },
};

// 发送消息的函数，修改此处以更好地console请求和响应数据
const sendMessage = async () => {
    try {
        const messageInput = document.getElementById('message-input') as HTMLInputElement;
        const query = messageInput.value;

        const requestData = {
            "query_type": 3,
            "query": query,
            "max_tokens": maxTokens.value,
            "only_need_context": true
        };

        // 在发送请求前，先console发送的数据
        console.log("发送给API的请求数据：", requestData);

        const response = await axios.post('/api/query/', requestData, {
            headers: { 'Content-Type': 'application/json' }
        });

        // console API返回的完整响应数据
        console.log("API返回的响应数据：", response);

        // 也可以进一步console响应数据中的具体内容，比如data部分
        console.log("API返回的响应数据中的data部分：", response.data);

    } catch (error) {
        console.error("发送请求时出错：", error);
    }
};
</script>

<template>
    <!-- 控件面板 -->
    <div class="demo-control-panel">
        <div>
            <label>节点数量:</label>
            <span>{{ nodeCount }}</span>
        </div>
        <div>
            <label>边数量:</label>
            <span>{{ edgeCount }}</span>
        </div>
        <div>
            <label for="toggle-force-layout">启用力学布局:</label>
            <input
                type="checkbox"
                id="toggle-force-layout"
                v-model="d3ForceEnabled"
            />
            <span>{{ d3ForceEnabled? '启用' : '禁用' }}</span>
        </div>
        <div>
            <label for="max-tokens-slider">max_tokens:</label>
            <input
                type="range"
                id="max-tokens-slider"
                v-model="maxTokens"
                min="100"
                max="1000"
            />
            <span>{{ maxTokens }}</span>
        </div>
    </div>

    <!-- 信息栏 -->
    <div v-if="tooltipOpacity === 1" class="info-sidebar">
        <h3>节点信息</h3>
        <p><strong>名称:</strong> {{ nodes[targetNodeId]?.name }}</p>
        <p><strong>描述:</strong> {{ nodes[targetNodeId]?.description }}</p>
        <p><strong>标签:</strong> {{ nodes[targetNodeId]?.label }}</p>
    </div>

    <div v-if="tooltipOpacity === 2" class="info-sidebar">
        <h3>边信息</h3>
        <p><strong>来源节点:</strong> {{ edges[targetNodeId]?.source }}</p>
        <p><strong>目标节点:</strong> {{ edges[targetNodeId]?.target }}</p>
        <p><strong>描述:</strong> {{ edges[targetNodeId]?.description }}</p>
        <p><strong>标签:</strong> {{ edges[targetNodeId]?.label }}</p>
        <p><strong>权重:</strong> {{ edges[targetNodeId]?.width }}</p>
    </div>

    <!-- 图形容器 -->
    <div class="graph-container">
        <v-network-graph
            :zoom-level="0.5"
            :nodes="nodes"
            :edges="edges"
            :layouts="layouts"
            :configs="configs"
            :eventHandlers="eventHandlers"
        >
            <!-- edge-label 插槽: 显示边的标签 -->
            <template #edge-label="{ edge,...slotProps }">
                <v-edge-label :text="edge.label" align="center" vertical-align="above" v-bind="slotProps" />
            </template>
        </v-network-graph>
    </div>

    <!-- 消息框和发送按钮 -->
    <div class="message-box-container">
        <input
            type="text"
            id="message-input"
            placeholder="请输入消息"
        />
        <button @click="sendMessage">发送</button>
    </div>
</template>

<style>
    /* 控制面板样式 */
   .demo-control-panel {
        position: absolute;
        z-index: 10;
        padding: 10px;
        background-color: rgba(255, 255, 255, 0.8);
        border-radius: 5px;
        top: 10px;
        left: 10px;
    }

   .graph-container {
        width: 100vw;
        height: 100vh;
        position: absolute;
        top: 0;
        left: 0;
        background-color: f5f5f5;
    }

    v-network-graph {
        width: 100%;
        height: 100%;
    }

    input[type="checkbox"] {
        margin-left: 10px;
    }

    span {
        margin-left: 10px;
    }

    /* 信息栏样式，移到右上角 */
   .info-sidebar {
        position: absolute;
        top: 10px;
        right: 10px;
        width: 300px;
        background-color: rgba(255, 255, 255, 0.8);
        padding: 20px;
        box-shadow: 2px 2px 10px rgba(0, 0, 0, 0.2);
        z-index: 20;
    }

    /* 消息框容器样式 */
   .message-box-container {
        position: absolute;
        bottom: 10px;
        left: 10px;
        display: flex;
        align-items: center;
    }

    input[type="text"] {
        padding: 5px;
        border: 1px solid #ccc;
        border-radius: 3px;
        margin-right: 10px;
    }

    button {
        padding: 5px 10px;
        background-color: #007BFF;
        color: white;
        border: none;
        border-radius: 3px;
        cursor: pointer;
    }
</style>
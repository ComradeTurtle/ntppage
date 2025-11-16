<script setup>
import { io } from "socket.io-client";
import {offsetFormat} from "~/utils/index.js";
const definitions = useState("definitions");
const currentTime = useState("currentTime");
const statusClasses = useState("statusClasses");
const servers = useState("servers");
const bestServer = useState("bestServer");
const totalRequestsPerSec = useState("totalRequestsPerSec");
const isStatsModalOpen = ref(false);
const currentStatsUrl = ref('');
const isStatsLoading = ref(false);

// Server configuration
const serverConfigs = [
  {
    id: 'gr',
    name: 'Server 1',
    hostname: 'gr.time.as215734.net',
    flag: '🇬🇷',
    timeUrl: 'https://gr1-ntpsync.comradeturtle.dev/time',
    socketUrl: 'https://grntp.comradeturtle.dev:2083',
    socketEvent: 'message-gr',
    statsAvailable: true,
    statsUrl: 'https://gr1-ntpsync.comradeturtle.dev/stats'
  },
  {
    id: 'gr2',
    name: 'Server 2',
    hostname: 'gr.time.vaggos.dev',
    flag: '🇬🇷',
    timeUrl: 'https://gr1-ntpsync.vaggos.dev/time',
    socketUrl: 'https://grntp.vaggos.dev:2083',
    socketEvent: 'message-gr',
    statsAvailable: false,
    statsUrl: 'https://gr1-ntpsync.vaggos.dev/stats'
  },
  {
    id: 'gr3',
    name: 'Server 3',
    hostname: 'gr.time.vkatranas.dev',
    flag: '🇬🇷',
    timeUrl: 'https://gr1-ntpsync.vkatranas.dev/time',
    socketUrl: 'https://grntp.vkatranas.dev:2083',
    socketEvent: 'message-gr',
    statsAvailable: false,
    statsUrl: 'https://gr1-ntpsync.vkatranas.dev/stats'
  },
  {
    id: 'gr4',
    name: 'Server 4',
    hostname: 'fr.time.as215734.net',
    flag: '🇫🇷',
    timeUrl: 'https://fr1-ntpsync.comradeturtle.dev/time',
    socketUrl: 'https://frntp.comradeturtle.dev:2083',
    socketEvent: 'message-gr',
    statsAvailable: true,
    statsUrl: 'https://fr1-ntpsync.comradeturtle.dev/stats'
  },
  // Add more servers here as needed
];

let intervals = {};

const device = useDevice();

const faqItems = [
  {
    label: 'What is this website?',
    content: "This website was made primarily to monitor my public NTP servers' health and accuracy. These servers are also part of the NTP Pool project. You can also check your system clock accuracy against these servers."
  },
  {
    label: 'What is NTP and what does it do?',
    content: 'An NTP (Network Time Protocol) server synchronizes the clocks of connected devices to a common, precise time source. Accurate time is essential for many applications, including logging events, coordinating distributed systems, ensuring security, and meeting regulatory requirements in fields like finance and telecommunications.'
  },
  {
    label: "How does a NTP server get its time?",
    content: "An NTP server receives time from a reference clock (e.g., GPS or another NTP server) and provides it to clients over a network. It uses algorithms to calculate delays and offsets, ensuring that the time it serves is as close to the reference time as possible."
  },
  {
    label: "How accurate is a NTP server?",
    slot: 'accuracy'
  },
  {
    label: "What do the statistics mean?",
    slot: 'statistics'
  },
  {
    label: 'What is the NTP Pool project?',
    content: "As written in ntppool.org: \"The pool.ntp.org project is a big virtual cluster of timeservers providing reliable, easy to use NTP service for millions of clients. The pool is being used by hundreds of millions of systems around the world. It's the default \"time server\" for most of the major Linux distributions and many networked appliances (see information for vendors).\""
  },
  {
    label: 'Can I run my own NTP server?',
    content: 'Of course! You can set up your own NTP server using Chrony or NTPd. Optionally, you can contribute your server to the NTP Pool project - the pool is always in need of more servers because of the large number of users it serves.'
  },
  {
    label: 'Why is my clock off by several seconds/minutes?',
    content: 'Large clock differences usually indicate that your device is not synchronizing with an NTP server, or there may be network issues preventing proper synchronization. Check your system\'s NTP configuration, ensure you have internet connectivity, and verify that NTP traffic (UDP port 123) is not blocked by firewalls.'
  },
  {
    label: 'How often should I sync my clock?',
    content: 'Most systems sync every 64-1024 seconds by default. The interval adjusts automatically based on network conditions and clock stability. Well-configured systems maintain accuracy within milliseconds between syncs. Manual syncing is rarely necessary unless there are significant system clock issues.'
  }
]

const fetchServerTime = async (serverConfig) => {
  try {
    const startTime = Date.now();
    const response = await fetch(serverConfig.timeUrl);
    const endTime = Date.now();

    const rtt = endTime - startTime;

    if (rtt > 1000) {
      return fetchServerTime(serverConfig);
    }

    const serverTime = await response.text();
    const serverTimestamp = parseInt(serverTime);

    const clientTimestamp = startTime + rtt / 2;
    const offset = serverTimestamp - clientTimestamp;

    updateClock(serverConfig.id, serverTimestamp, offset, rtt);
  } catch (error) {
    console.error(`Failed to fetch server time for ${serverConfig.id}:`, error);
  }
}

const updateClock = async (serverId, serverTimestamp, offset, rtt) => {
  function tick() {
    const currentClientTime = Date.now();
    const currentServerTime = currentClientTime + offset;

    const serverDate = new Date(currentServerTime);
    const milliseconds = serverDate.getMilliseconds();
    const tenthsOfSecond = Math.floor(milliseconds / 100);
    const timeString = `${serverDate.toLocaleTimeString('en-GB')}.${tenthsOfSecond}`;
    
    if (!servers.value) servers.value = {};
    if (!servers.value[serverId]) servers.value[serverId] = {};
    
    servers.value[serverId].serverTime = timeString;
    servers.value[serverId].clientOffset = offset;
    servers.value[serverId].uncertainty = rtt;
  }

  if (intervals[serverId]) clearInterval(intervals[serverId]);
  intervals[serverId] = setInterval(tick, 50);
  tick();
}

const updateBestServer = () => {
  if (!servers.value) return;
  
  let bestServerId = null;
  let lowestDispersion = Infinity;
  let totalRequests = 0;
  
  for (const [serverId, serverData] of Object.entries(servers.value)) {
    if (serverData.socketData?.dispersion !== undefined) {
      if (serverData.socketData.dispersion < lowestDispersion) {
        lowestDispersion = serverData.socketData.dispersion;
        bestServerId = serverId;
      }
    }
    
    if (serverData.socketData?.lifetime?.persecond) {
      totalRequests += parseFloat(serverData.socketData.lifetime.persecond);
    }
  }
  
  if (bestServerId) {
    const serverConfig = serverConfigs.find(s => s.id === bestServerId);
    bestServer.value = serverConfig?.hostname || 'Unknown';
  }
  
  totalRequestsPerSec.value = totalRequests;
}

const isBestServer = (serverId) => {
  if (!servers.value || !servers.value[serverId]?.socketData) return false;
  
  let bestServerId = null;
  let lowestDispersion = Infinity;
  
  for (const [id, serverData] of Object.entries(servers.value)) {
    if (serverData.socketData?.dispersion !== undefined) {
      if (serverData.socketData.dispersion < lowestDispersion) {
        lowestDispersion = serverData.socketData.dispersion;
        bestServerId = id;
      }
    }
  }
  
  return bestServerId === serverId;
}

const openStatsModal = (statsUrl) => {
  currentStatsUrl.value = statsUrl;
  isStatsLoading.value = true;
  isStatsModalOpen.value = true;
}

const closeStatsModal = () => {
  isStatsModalOpen.value = false;
  isStatsLoading.value = false;
  currentStatsUrl.value = '';
}

const onIframeLoad = () => {
  isStatsLoading.value = false;
}

onMounted(() => {
  // Initialize servers state
  servers.value = {};
  
  // Setup connections for all servers
  serverConfigs.forEach(serverConfig => {
    // Initialize server data
    servers.value[serverConfig.id] = {
      config: serverConfig,
      socketData: null,
      serverTime: null,
      clientOffset: null,
      uncertainty: null,
      status: 'connecting'
    };
    
    // Setup socket connection
    const socket = io(serverConfig.socketUrl);
    
    socket.on('connect', () => {
      servers.value[serverConfig.id].status = 'connected';
      statusClasses.value.active = 'normal';
    });
    
    socket.on('disconnect', () => {
      servers.value[serverConfig.id].status = 'disconnected';
      statusClasses.value.active = 'danger';
    });
    
    socket.on('connect_error', () => {
      servers.value[serverConfig.id].status = 'error';
      statusClasses.value.active = 'danger';
    });
    
    socket.on(serverConfig.socketEvent, (data) => {
      servers.value[serverConfig.id].socketData = data;
      updateBestServer();
    });
    
    // Start time sync for this server
    fetchServerTime(serverConfig);
    setInterval(() => fetchServerTime(serverConfig), 10000);
  });
  
  // Update best server initially
  updateBestServer();
})
</script>

<template>
  <Flex column justify="center" items="center" gap="2" class="pt-6">
    <Flex column justify="center" items="center" class="p-4 bg-gray-900 rounded-xl border md:w-2/3 w-full border-2" :class="statusClasses[statusClasses.active]">
      <h1 class="md:text-2xl text-xl text-center" v-if="bestServer">Current best server based on root dispersion: <span class="font-semibold">{{ bestServer }}</span></h1>
      <h1 class="md:text-2xl text-xl text-center" v-else>Calculating best server...</h1>

      <h1 class="md:text-xl text-lg" v-if="totalRequestsPerSec">Total requests/sec: <span class="font-semibold text-blue-600">{{ totalRequestsPerSec }}</span></h1>
      <h1 class="md:text-xl text-lg" v-else>Loading statistics...</h1>
    </Flex>
    <h1 class="text-center italic">Hover above the information icon to learn about each parameter.</h1>

    <!-- Dynamic server cards in responsive grid -->
    <div class="w-5/6 grid gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      <div v-if="servers" v-for="(server, serverId) in servers" :key="serverId">
          <Flex column justify="center" items="center" class="bg-gray-900 w-full p-4 border-2 rounded-xl h-full" :class="statusClasses[statusClasses.active]">
            <div class="w-full">
              <Flex row justify="between">
                <Flex row items="center" gap="2">
                  <h1 class="text-2xl">{{ server.config?.name || 'Server' }}</h1>
                  <span v-if="isBestServer(serverId)" class="text-yellow-400 text-xl">⭐</span>
                </Flex>
                <h1 class="text-2xl">{{ server.config?.flag || '🌍' }}</h1>
              </Flex>
              <Flex row justify="start">
                <h1 class="text-gray-400">{{ server.config?.hostname || 'Unknown' }}</h1>
              </Flex>

              <UDivider label="Client Offset" size="xs" class="py-4" />

              <Flex row justify="center">
                <h1 class="text-2xl" v-if="server.serverTime">Server time: <span class="font-semibold text-blue-600">{{ server.serverTime }}</span></h1>
                <h1 class="text-xl" v-else>Fetching server time...</h1>
              </Flex>

              <Flex row justify="center">
                <h1 v-if="server.clientOffset !== null && server.clientOffset !== undefined">Your clock is {{ offsetFormat(server.clientOffset) }} (±{{ server.uncertainty }}ms).</h1>
                <h1 v-else>Calculating offset...</h1>
              </Flex>

              <UDivider label="Source Statistics" size="xs" class="py-4" />

              <Flex row justify="between">
                <Flex row justify="start" items="center" gap="1">
                  <h1 class="text-xl">Stratum:</h1>
                  <UTooltip class="pt-1.5" :text="definitions.stratum" :popper="device.isDesktop ? { placement: 'right' } : ''" :ui="{width: 'max-w-md', base: '[@media(pointer:coarse)]:!block h-fit px-2 py-1 text-xs font-normal text-wrap relative'}"><UIcon name="i-mdi-information-circle-outline" class="text-base"/></UTooltip>
                </Flex>
                <h1 v-if="server.socketData" class="text-xl font-semibold text-blue-600">{{ server.socketData.stratum }}</h1>
                <h1 v-else class="text-xl font-semibold text-blue-600">Loading..</h1>
              </Flex>

              <Flex row justify="between" class="pt-4">
                <Flex row justify="start" items="center" gap="1">
                  <h1 class="text-xl">Origin:</h1>
                  <UTooltip class="pt-1.5" :text="definitions.origin" :popper="device.isDesktop ? { placement: 'right' } : ''" :ui="{width: 'max-w-md', base: '[@media(pointer:coarse)]:!block h-fit px-2 py-1 text-xs font-normal text-wrap relative'}"><UIcon name="i-mdi-information-circle-outline" class="text-base"/></UTooltip>
                </Flex>
                <h1 v-if="server.socketData" class="text-xl font-semibold text-blue-600">{{ server.socketData.origin }}</h1>
                <h1 v-else class="text-xl font-semibold text-blue-600">Loading..</h1>
              </Flex>

              <Flex row justify="between" class="pt-4">
                <Flex row justify="start" items="center" gap="1">
                  <h1 class="text-xl">Root Dispersion:</h1>
                  <UTooltip class="pt-1.5" :text="definitions.rootDispersion" :popper="device.isDesktop ? { placement: 'right' } : ''" :ui="{width: 'max-w-md', base: '[@media(pointer:coarse)]:!block h-fit px-2 py-1 text-xs font-normal text-wrap relative'}"><UIcon name="i-mdi-information-circle-outline" class="text-base"/></UTooltip>
                </Flex>
                <h1 v-if="server.socketData" class="text-xl font-semibold"><span class="text-blue-600">{{ secondsToSubmultiples(server.socketData.dispersion).value }}</span>{{ secondsToSubmultiples(server.socketData.dispersion).unit }}</h1>
                <h1 v-else class="text-xl font-semibold text-blue-600">Loading..</h1>
              </Flex>

              <Flex row justify="between" class="pt-4">
                <Flex row justify="start" items="center" gap="1">
                  <h1 class="text-xl">Leap status:</h1>
                  <UTooltip class="pt-1.5" :text="definitions.leapStatus" :popper="device.isDesktop ? { placement: 'right' } : ''" :ui="{width: 'max-w-md', base: '[@media(pointer:coarse)]:!block h-fit px-2 py-1 text-xs font-normal text-wrap relative'}"><UIcon name="i-mdi-information-circle-outline" class="text-base"/></UTooltip>
                </Flex>
                <h1 v-if="server.socketData" class="text-xl font-semibold text-blue-600">{{ server.socketData.leap }}</h1>
                <h1 v-else class="text-xl font-semibold text-blue-600">Loading..</h1>
              </Flex>

              <UDivider label="System Clock" size="xs" class="py-4" />

              <Flex row justify="between">
                <Flex row justify="start" items="center" gap="1">
                  <h1 class="text-xl">System RMS Offset:</h1>
                  <UTooltip class="pt-1.5" :text="definitions.rmsOffset" :popper="device.isDesktop ? { placement: 'right' } : ''" :ui="{width: 'max-w-md', base: '[@media(pointer:coarse)]:!block h-fit px-2 py-1 text-xs font-normal text-wrap relative'}"><UIcon name="i-mdi-information-circle-outline" class="text-base"/></UTooltip>
                </Flex>
                <h1 v-if="server.socketData" class="text-xl font-semibold"><span class="text-blue-600">{{ secondsToSubmultiples(server.socketData.rmsoffset).value }}</span>{{ secondsToSubmultiples(server.socketData.rmsoffset).unit }}</h1>
                <h1 v-else class="text-xl font-semibold text-blue-600">Loading..</h1>
              </Flex>

              <Flex row justify="between" class="pt-4 align-middle">
                <Flex row justify="start" items="center" gap="1">
                  <h1 class="text-xl">Residual Frequency:</h1>
                  <UTooltip class="pt-1.5" :text="definitions.residualFreq" :popper="device.isDesktop ? { placement: 'right' } : ''" :ui="{width: 'max-w-md', base: '[@media(pointer:coarse)]:!block h-fit px-2 py-1 text-xs font-normal text-wrap relative'}"><UIcon name="i-mdi-information-circle-outline" class="text-base"/></UTooltip>
                </Flex>
                <h1 v-if="server.socketData" class="text-xl font-semibold"><span class="text-blue-600">{{ server.socketData.residual }}</span> ppm</h1>
                <h1 v-else class="text-xl font-semibold text-blue-600">Loading..</h1>
              </Flex>

              <Flex row justify="between" items="center" class="pt-4">
                <Flex row justify="start" items="center" gap="1">
                  <h1 class="text-xl">Skew:</h1>
                  <UTooltip class="pt-1.5" :text="definitions.skew" :popper="device.isDesktop ? { placement: 'right' } : ''" :ui="{width: 'max-w-md', base: '[@media(pointer:coarse)]:!block h-fit px-2 py-1 text-xs font-normal text-wrap relative'}"><UIcon name="i-mdi-information-circle-outline" class="text-base"/></UTooltip>
                </Flex>
                <h1 v-if="server.socketData" class="text-xl font-semibold"><span class="text-blue-600">{{ server.socketData.skew }}</span> ppm</h1>
                <h1 v-else class="text-xl font-semibold text-blue-600">Loading..</h1>
              </Flex>

              <UDivider label="Server Statistics" size="xs" class="py-4" />

              <Flex column justify="between">
                <h1 class="text-xl">Lifetime Requests:</h1>

                <Flex row justify="between" class="ps-1 pt-2">
                  <h1 class="text-xl">Current:</h1>
                  <h1 v-if="server.socketData" class="text-xl font-semibold text-blue-600">{{ server.socketData.lifetime.current }}</h1>
                  <h1 v-else class="text-xl font-semibold text-blue-600">Loading..</h1>
                </Flex>

                <Flex row justify="between" class="ps-1 pt-2">
                  <h1 class="text-xl">Per second:</h1>
                  <h1 v-if="server.socketData" class="text-xl font-semibold text-blue-600">{{ server.socketData.lifetime.persecond }}</h1>
                  <h1 v-else class="text-xl font-semibold text-blue-600">Loading..</h1>
                </Flex>
              </Flex>

              <!-- Stats Section -->
              <div class="mt-4 pt-4 border-t border-gray-700">
                <UButton 
                  v-if="server.config?.statsAvailable"
                  @click="openStatsModal(server.config.statsUrl)" 
                  variant="outline" 
                  color="blue" 
                  size="sm" 
                  class="w-full"
                  icon="i-mdi-chart-line"
                >
                  View Detailed Stats
                </UButton>
                <p v-else class="text-center text-gray-400 text-sm py-2">
                  Detailed statistics not available for this server.
                </p>
              </div>
            </div>
          </Flex>
        </div>
    </div>
    <div class="w-5/6 my-8">
      <div class="bg-gray-900 rounded-xl border-2 border-gray-700 p-6 shadow-xl">
        <!-- Header Section -->
        <div class="text-center mb-6">
          <div class="flex items-center justify-center gap-3 mb-3">
            <div class="p-2 bg-blue-600 rounded-lg">
              <UIcon name="i-mdi-help-circle-outline" class="text-white text-2xl" />
            </div>
            <h2 class="text-3xl font-bold text-white">Frequently Asked Questions</h2>
          </div>
          <p class="text-gray-400 text-lg">Everything you need to know about NTP and time synchronization</p>
        </div>

        <!-- FAQ Accordion -->
        <div class="max-w-4xl mx-auto">
          <UAccordion 
            open-icon="i-mdi-chevron-down" 
            close-icon="i-mdi-chevron-up" 
            color="primary" 
            variant="soft" 
            size="lg" 
            :items="faqItems"
            :ui="{
              wrapper: 'space-y-3',
              item: {
                base: 'bg-gray-800 border border-gray-600 rounded-lg overflow-hidden hover:border-blue-500 transition-colors duration-200',
                padding: 'p-0',
                color: 'text-white'
              },
              trigger: 'px-4 py-4 text-left font-medium text-lg hover:bg-gray-700 transition-colors duration-200',
              content: 'px-4 pb-4 text-gray-300 leading-relaxed'
            }"
          >
            <template #accuracy="{ description }">
              <div class="space-y-3">
                <p class="text-gray-300 leading-relaxed">The accuracy of an NTP server depends on its stratum level and the quality of its reference clock.</p>
                <div class="bg-gray-700 rounded-lg p-4">
                  <h4 class="text-blue-400 font-semibold mb-2">Typical Accuracy Levels:</h4>
                  <ul class="space-y-2 text-gray-300">
                    <li class="flex items-start gap-2">
                      <span class="text-green-400 mt-1">•</span>
                      <span><strong class="text-white">Stratum 1:</strong> ±5μs to a few milliseconds (directly connected to reference clock)</span>
                    </li>
                    <li class="flex items-start gap-2">
                      <span class="text-yellow-400 mt-1">•</span>
                      <span><strong class="text-white">Stratum 2:</strong> ±10ms (synchronized to Stratum 1 server)</span>
                    </li>
                    <li class="flex items-start gap-2">
                      <span class="text-orange-400 mt-1">•</span>
                      <span><strong class="text-white">Public NTP:</strong> ±10-100ms (due to network delays)</span>
                    </li>
                  </ul>
                </div>
              </div>
            </template>

            <template #statistics="{ description }">
              <div class="space-y-4">
                <p class="text-gray-300 leading-relaxed">Here's what each statistic shown on the server cards means:</p>
                
                <div class="grid md:grid-cols-2 gap-4">
                  <div class="bg-gray-700 rounded-lg p-4">
                    <h4 class="text-blue-400 font-semibold mb-3 flex items-center gap-2">
                      <UIcon name="i-mdi-server" class="text-sm" />
                      Source Statistics
                    </h4>
                    <div class="space-y-2 text-sm">
                      <div><strong class="text-white">Stratum:</strong> <span class="text-gray-300">Distance from reference clock (1 = direct connection)</span></div>
                      <div><strong class="text-white">Origin:</strong> <span class="text-gray-300">Type of reference clock source</span></div>
                      <div><strong class="text-white">Root Dispersion:</strong> <span class="text-gray-300">Maximum error estimate from reference</span></div>
                      <div><strong class="text-white">Leap Status:</strong> <span class="text-gray-300">Leap second indicator</span></div>
                    </div>
                  </div>
                  
                  <div class="bg-gray-700 rounded-lg p-4">
                    <h4 class="text-blue-400 font-semibold mb-3 flex items-center gap-2">
                      <UIcon name="i-mdi-clock" class="text-sm" />
                      System Clock
                    </h4>
                    <div class="space-y-2 text-sm">
                      <div><strong class="text-white">RMS Offset:</strong> <span class="text-gray-300">Average timing error over time</span></div>
                      <div><strong class="text-white">Residual Frequency:</strong> <span class="text-gray-300">Clock frequency adjustment (ppm)</span></div>
                      <div><strong class="text-white">Skew:</strong> <span class="text-gray-300">Rate of frequency change (ppm)</span></div>
                    </div>
                  </div>
                </div>

                <div class="bg-blue-600/10 border border-blue-600/30 rounded-lg p-4">
                  <h4 class="text-blue-300 font-semibold mb-2 flex items-center gap-2">
                    <UIcon name="i-mdi-lightbulb-on" class="text-sm" />
                    Quick Tip
                  </h4>
                  <p class="text-gray-300 text-sm">Lower values for RMS Offset, Root Dispersion, and Skew indicate better time accuracy. The ⭐ star marks the server with the lowest root dispersion.</p>
                </div>
              </div>
            </template>
          </UAccordion>
        </div>

        <!-- Bottom Note -->
        <div class="mt-6 pt-4 border-t border-gray-700">
          <p class="text-center text-gray-400 text-sm">
            Have more questions? Feel free to explore the detailed statistics for historical server performance data.
          </p>
        </div>
      </div>
    </div>

    <!-- Fullscreen Stats Modal -->
    <UModal v-model="isStatsModalOpen" fullscreen>
      <div class="h-screen flex flex-col">
        <div class="flex items-center justify-between p-4 bg-gray-900 border-b border-gray-700">
          <h3 class="text-lg font-semibold text-white">Server Statistics</h3>
          <UButton 
            @click="closeStatsModal" 
            color="gray" 
            variant="ghost" 
            icon="i-mdi-close" 
            size="sm"
          />
        </div>
        
        <div class="flex-1 relative">
          <!-- Loading indicator -->
          <div v-if="isStatsLoading" class="absolute inset-0 flex items-center justify-center bg-gray-800 bg-opacity-75 z-10">
            <div class="flex flex-col items-center gap-4">
              <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              <p class="text-white text-lg">Loading server statistics...</p>
            </div>
          </div>
          
          <!-- Stats iframe -->
          <iframe 
            v-if="currentStatsUrl" 
            :src="currentStatsUrl" 
            class="w-full h-full border-0"
            sandbox="allow-scripts allow-same-origin"
            @load="onIframeLoad"
          />
        </div>
      </div>
    </UModal>
  </Flex>
</template>

<style>
body {
  background-color: #252a2e;
}
</style>
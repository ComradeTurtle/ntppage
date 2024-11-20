<script setup>
  import { io } from "socket.io-client";
  import {offsetFormat} from "~/utils/index.js";
  const definitions = useState("definitions");
  const currentTime = useState("currentTime");
  const socketData = useState("socketData");
  const statusClasses = useState("statusClasses");
  const serverTime = useState("serverTime");
  const clientOffset = useState("clientOffset");
  const uncertainty = useState("uncertainty");
  let interval;

  const device = useDevice();

  const fetchServerTime = async () => {
    try {
      const startTime = Date.now();
      const response = await fetch('https://gr1-ntpsync.comradeturtle.dev/time');
      const endTime = Date.now();

      const rtt = endTime - startTime;

      if (rtt > 1000) {
        return fetchServerTime();
      }

      const serverTime = await response.text(); // Parse the server's response
      const serverTimestamp = parseInt(serverTime); // Assume server returns { "timestamp": 1699461234567 }

      const clientTimestamp = startTime + rtt / 2; // Estimate when the server time arrived
      const offset = serverTimestamp - clientTimestamp; // Calculate the offset

      // Update clock display
      updateClock(serverTimestamp, offset, rtt);
    } catch (error) {
      console.error('Failed to fetch server time:', error);
    }
  }

  const updateClock = async (serverTimestamp, offset, rtt) => {
    function tick() {
      const currentClientTime = Date.now();
      const currentServerTime = currentClientTime + offset;

      const serverDate = new Date(currentServerTime);
      uncertainty.value = rtt;
      clientOffset.value = offset;
      serverTime.value = `${serverDate.toLocaleTimeString('en-GB')}.${serverDate.getMilliseconds().toString()[0]}`;
    }

    if (interval) clearInterval(interval);
    interval = setInterval(tick, 50); // Update the clock every second
    tick(); // Initial tick
  }

  onMounted(() => {
    const socket = io("https://grntp.comradeturtle.dev:2083");

    socket.on('connect', () => {
      statusClasses.value.active = 'normal';
    })

    socket.on('disconnect', () => {
      statusClasses.value.active = 'danger';
    })

    socket.on('connect_error', () => {
      statusClasses.value.active = 'danger';
    })

    socket.on('message-gr', (e) => {
      socketData.value = e;
    })

    fetchServerTime();
    setInterval(fetchServerTime, 10000); // Refresh every minute
  })
</script>

<template>
  <Flex column justify="center" items="center" gap="2" class="pt-6">
    <Flex column justify="center" items="center" class="p-4 bg-gray-900 rounded-xl border md:w-1/3 w-full border-2" :class="statusClasses[statusClasses.active]">
      <h1 class="md:text-3xl text-2xl" v-if="serverTime">Current server time: <span class="font-semibold">{{ serverTime }}</span></h1>
      <h1 class="md:text-3xl text-2xl" v-else>Fetching server time..</h1>

      <h1 v-if="clientOffset || clientOffset === 0">Your clock is {{ offsetFormat(clientOffset) }} (±{{ uncertainty }}ms).</h1>
      <h1 v-else>Calculating offset..</h1>
    </Flex>
    <h1 class="text-center italic">Hover above the information icon to learn about each parameter.</h1>

    <Flex column justify="center" items="center" class="border bg-gray-900 md:w-2/3 w-full p-4 mt-6 border-2 rounded-xl" :class="statusClasses[statusClasses.active]">
      <div class="w-full">
        <Flex row justify="between">
          <h1 class="text-2xl">Server - GR</h1>
          <h1 class="text-2xl">🇬🇷</h1>
        </Flex>
        <Flex row justify="start">
          <h1 class="text-gray-400">gr.time.turtlex.net</h1>
        </Flex>

        <UDivider label="Source Statistics" size="md" class="py-4" />

        <Flex row justify="between">
          <Flex row justify="start" items="center" gap="1">
            <h1 class="text-xl">Stratum:</h1>
            <UTooltip class="pt-1.5" :text="definitions.stratum" :popper="device.isDesktop ? { placement: 'right' } : ''" :ui="{width: 'max-w-md', base: '[@media(pointer:coarse)]:!block h-fit px-2 py-1 text-xs font-normal text-wrap relative'}"><UIcon name="i-mdi-information-circle-outline" class="text-base"/></UTooltip>
          </Flex>
          <h1 v-if="socketData" class="text-xl font-semibold text-blue-600">{{ socketData.stratum }}</h1>
          <h1 v-else class="text-xl font-semibold text-blue-600">Loading..</h1>
        </Flex>

        <Flex row justify="between" class="pt-4">
          <Flex row justify="start" items="center" gap="1">
            <h1 class="text-xl">Origin:</h1>
            <UTooltip class="pt-1.5" :text="definitions.origin" :popper="device.isDesktop ? { placement: 'right' } : ''" :ui="{width: 'max-w-md', base: '[@media(pointer:coarse)]:!block h-fit px-2 py-1 text-xs font-normal text-wrap relative'}"><UIcon name="i-mdi-information-circle-outline" class="text-base"/></UTooltip>
          </Flex>
          <h1 v-if="socketData" class="text-xl font-semibold text-blue-600">{{ socketData.origin }}</h1>
          <h1 v-else class="text-xl font-semibold text-blue-600">Loading..</h1>
        </Flex>

        <Flex row justify="between" class="pt-4">
          <Flex row justify="start" items="center" gap="1">
            <h1 class="text-xl">Root Dispersion:</h1>
            <UTooltip class="pt-1.5" :text="definitions.rootDispersion" :popper="device.isDesktop ? { placement: 'right' } : ''" :ui="{width: 'max-w-md', base: '[@media(pointer:coarse)]:!block h-fit px-2 py-1 text-xs font-normal text-wrap relative'}"><UIcon name="i-mdi-information-circle-outline" class="text-base"/></UTooltip>
          </Flex>
          <h1 v-if="socketData" class="text-xl font-semibold"><span class="text-blue-600">{{ secondsToSubmultiples(socketData.dispersion).value }}</span>{{ secondsToSubmultiples(socketData.dispersion).unit }}</h1>
          <h1 v-else class="text-xl font-semibold text-blue-600">Loading..</h1>
        </Flex>

        <Flex row justify="between" class="pt-4">
          <Flex row justify="start" items="center" gap="1">
            <h1 class="text-xl">Leap status:</h1>
            <UTooltip class="pt-1.5" :text="definitions.leapStatus" :popper="device.isDesktop ? { placement: 'right' } : ''" :ui="{width: 'max-w-md', base: '[@media(pointer:coarse)]:!block h-fit px-2 py-1 text-xs font-normal text-wrap relative'}"><UIcon name="i-mdi-information-circle-outline" class="text-base"/></UTooltip>
          </Flex>
          <h1 v-if="socketData" class="text-xl font-semibold text-blue-600">{{ socketData.leap }}</h1>
          <h1 v-else class="text-xl font-semibold text-blue-600">Loading..</h1>
        </Flex>

        <UDivider label="System Clock" size="md" class="py-4" />

        <Flex row justify="between">
          <Flex row justify="start" items="center" gap="1">
            <h1 class="text-xl">System RMS Offset:</h1>
            <UTooltip class="pt-1.5" :text="definitions.rmsOffset" :popper="device.isDesktop ? { placement: 'right' } : ''" :ui="{width: 'max-w-md', base: '[@media(pointer:coarse)]:!block h-fit px-2 py-1 text-xs font-normal text-wrap relative'}"><UIcon name="i-mdi-information-circle-outline" class="text-base"/></UTooltip>
          </Flex>
          <h1 v-if="socketData" class="text-xl font-semibold"><span class="text-blue-600">{{ secondsToSubmultiples(socketData.rmsoffset).value }}</span>{{ secondsToSubmultiples(socketData.rmsoffset).unit }}</h1>
          <h1 v-else class="text-xl font-semibold text-blue-600">Loading..</h1>
        </Flex>

        <Flex row justify="between" class="pt-4 align-middle">
          <Flex row justify="start" items="center" gap="1">
            <h1 class="text-xl">Residual Frequency:</h1>
            <UTooltip class="pt-1.5" :text="definitions.residualFreq" :popper="device.isDesktop ? { placement: 'right' } : ''" :ui="{width: 'max-w-md', base: '[@media(pointer:coarse)]:!block h-fit px-2 py-1 text-xs font-normal text-wrap relative'}"><UIcon name="i-mdi-information-circle-outline" class="text-base"/></UTooltip>
          </Flex>
          <h1 v-if="socketData" class="text-xl font-semibold"><span class="text-blue-600">{{ socketData.residual }}</span> ppm</h1>
          <h1 v-else class="text-xl font-semibold text-blue-600">Loading..</h1>
        </Flex>

        <Flex row justify="between" items="center" class="pt-4">
          <Flex row justify="start" items="center" gap="1">
            <h1 class="text-xl">Skew:</h1>
            <UTooltip class="pt-1.5" :text="definitions.skew" :popper="device.isDesktop ? { placement: 'right' } : ''" :ui="{width: 'max-w-md', base: '[@media(pointer:coarse)]:!block h-fit px-2 py-1 text-xs font-normal text-wrap relative'}"><UIcon name="i-mdi-information-circle-outline" class="text-base"/></UTooltip>
          </Flex>
          <h1 v-if="socketData" class="text-xl font-semibold"><span class="text-blue-600">{{ socketData.skew }}</span> ppm</h1>
          <h1 v-else class="text-xl font-semibold text-blue-600">Loading..</h1>
        </Flex>

        <UDivider label="Server Statistics" size="md" class="py-4" />

        <Flex column justify="between">
          <h1 class="text-xl">Lifetime Requests:</h1>

          <Flex row justify="between" class="ps-1 pt-2">
            <h1 class="text-xl">Current:</h1>
            <h1 v-if="socketData" class="text-xl font-semibold text-blue-600">{{ socketData.lifetime.current }}</h1>
            <h1 v-else class="text-xl font-semibold text-blue-600">Loading..</h1>
          </Flex>

          <Flex row justify="between" class="ps-1 pt-2">
            <h1 class="text-xl">Per second:</h1>
            <h1 v-if="socketData" class="text-xl font-semibold text-blue-600">{{ socketData.lifetime.persecond }}</h1>
            <h1 v-else class="text-xl font-semibold text-blue-600">Loading..</h1>
          </Flex>
        </Flex>
      </div>
    </Flex>
  </Flex>
</template>

<style>
  body {
    background-color: #252a2e;
  }
</style>
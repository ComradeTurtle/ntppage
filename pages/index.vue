<script setup>
  import { io } from "socket.io-client";
  const tooltipUI = {width: 'max-w-md', base: '[@media(pointer:coarse)]:!block h-fit px-2 py-1 text-xs font-normal text-wrap relative'};
  const definitions = useState("definitions");
  const currentTime = useState("currentTime");
  const socketData = useState("socketData");
  const statusClasses = useState("statusClasses");

  const device = useDevice();
  
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

    console.log(device.isDesktop, device.isMobile)
    setInterval(() => {
      currentTime.value = `${new Date().toLocaleDateString('en-GB')} ${new Date().toLocaleTimeString('en-GB')}`
    }, 100);
  })
</script>

<template>
  <Flex column justify="center" items="center" gap="2" class="pt-6">
    <Flex column justify="center" items="center" class="p-4 bg-gray-900 rounded-xl border md:w-1/3 w-2/3 border-2" :class="statusClasses[statusClasses.active]">
      <h1 class="text-2xl font-semibold">Your current system time:</h1>
      <h1 class="text-3xl">{{ currentTime }}</h1>
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
            <UTooltip class="pt-1.5" :text="definitions.stratum" :popper="device.isDesktop ? { placement: 'right' } : ''" :ui="tooltipUI"><UIcon name="i-mdi-information-circle-outline" class="text-base"/></UTooltip>
          </Flex>
          <h1 v-if="socketData" class="text-xl font-semibold text-blue-600">{{ socketData.stratum }}</h1>
          <h1 v-else class="text-xl font-semibold text-blue-600">Loading..</h1>
        </Flex>

        <Flex row justify="between" class="pt-4">
          <Flex row justify="start" items="center" gap="1">
            <h1 class="text-xl">Origin:</h1>
            <UTooltip class="pt-1.5" :text="definitions.origin" :popper="device.isDesktop ? { placement: 'right' } : ''" :ui="tooltipUI"><UIcon name="i-mdi-information-circle-outline" class="text-base"/></UTooltip>
          </Flex>
          <h1 v-if="socketData" class="text-xl font-semibold text-blue-600">{{ socketData.origin }}</h1>
          <h1 v-else class="text-xl font-semibold text-blue-600">Loading..</h1>
        </Flex>

        <Flex row justify="between" class="pt-4">
          <Flex row justify="start" items="center" gap="1">
            <h1 class="text-xl">Root Dispersion:</h1>
            <UTooltip class="pt-1.5" :text="definitions.rootDispersion" :popper="device.isDesktop ? { placement: 'right' } : ''" :ui="tooltipUI"><UIcon name="i-mdi-information-circle-outline" class="text-base"/></UTooltip>
          </Flex>
          <h1 v-if="socketData" class="text-xl font-semibold"><span class="text-blue-600">{{ secondsToSubmultiples(socketData.dispersion).value }}</span>{{ secondsToSubmultiples(socketData.dispersion).unit }}</h1>
          <h1 v-else class="text-xl font-semibold text-blue-600">Loading..</h1>
        </Flex>

        <Flex row justify="between" class="pt-4">
          <Flex row justify="start" items="center" gap="1">
            <h1 class="text-xl">Leap status:</h1>
            <UTooltip class="pt-1.5" :text="definitions.leapStatus" :popper="device.isDesktop ? { placement: 'right' } : ''" :ui="tooltipUI"><UIcon name="i-mdi-information-circle-outline" class="text-base"/></UTooltip>
          </Flex>
          <h1 v-if="socketData" class="text-xl font-semibold text-blue-600">{{ socketData.leap }}</h1>
          <h1 v-else class="text-xl font-semibold text-blue-600">Loading..</h1>
        </Flex>

        <UDivider label="System Clock" size="md" class="py-4" />

        <Flex row justify="between">
          <Flex row justify="start" items="center" gap="1">
            <h1 class="text-xl">System RMS Offset:</h1>
            <UTooltip class="pt-1.5" :text="definitions.rmsOffset" :popper="device.isDesktop ? { placement: 'right' } : ''" :ui="tooltipUI"><UIcon name="i-mdi-information-circle-outline" class="text-base"/></UTooltip>
          </Flex>
          <h1 v-if="socketData" class="text-xl font-semibold"><span class="text-blue-600">{{ secondsToSubmultiples(socketData.rmsoffset).value }}</span>{{ secondsToSubmultiples(socketData.rmsoffset).unit }}</h1>
          <h1 v-else class="text-xl font-semibold text-blue-600">Loading..</h1>
        </Flex>

        <Flex row justify="between" class="pt-4 align-middle">
          <Flex row justify="start" items="center" gap="1">
            <h1 class="text-xl">Residual Frequency:</h1>
            <UTooltip class="pt-1.5" :text="definitions.residualFreq" :popper="device.isDesktop ? { placement: 'right' } : ''" :ui="tooltipUI"><UIcon name="i-mdi-information-circle-outline" class="text-base"/></UTooltip>
          </Flex>
          <h1 v-if="socketData" class="text-xl font-semibold"><span class="text-blue-600">{{ socketData.residual }}</span> ppm</h1>
          <h1 v-else class="text-xl font-semibold text-blue-600">Loading..</h1>
        </Flex>

        <Flex row justify="between" items="center" class="pt-4">
          <Flex row justify="start" items="center" gap="1">
            <h1 class="text-xl">Skew:</h1>
            <UTooltip class="pt-1.5" :text="definitions.skew" :popper="device.isDesktop ? { placement: 'right' } : ''" :ui="tooltipUI"><UIcon name="i-mdi-information-circle-outline" class="text-base"/></UTooltip>
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
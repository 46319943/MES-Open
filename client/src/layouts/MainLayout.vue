<template>
  <q-layout view="hHh lpR fFf">
    <q-header elevated class="bg-primary text-white">
      <q-toolbar>
        <q-toolbar-title> Multisensory Experience Dashboard </q-toolbar-title>

        <q-tabs shrink stretch>
          <q-route-tab to="/datasets" label="Datasets" />
          <q-route-tab to="/data" label="Data" />
          <q-route-tab to="/prompts" label="Prompts" />
          <q-route-tab to="/output-formats" label="Output Formats" />
          <q-route-tab to="/data-boost" label="Data Boost" />
          <q-route-tab to="/model-finetune" label="Model Finetune" />
          <q-route-tab to="/model-infer" label="Model Infer" />
        </q-tabs>
      </q-toolbar>
    </q-header>

    <q-page-container>
      <router-view v-slot="{ Component }">
        <Suspense>
          <component :is="Component" />
        </Suspense>
      </router-view>
    </q-page-container>

    <!-- Error Display Component -->
    <ErrorDisplay />
  </q-layout>
</template>

<script setup lang="ts">
import ErrorDisplay from '@/components/common/ErrorDisplay.vue';
</script>

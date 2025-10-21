import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      {
        path: '',
        redirect: '/datasets',
      },
      {
        path: 'datasets',
        name: 'DatasetManagement',
        component: () => import('pages/DatasetManagementPage.vue'),
      },
      {
        path: 'data',
        name: 'DataManagement',
        component: () => import('pages/DataManagementPage.vue'),
      },
      {
        path: 'prompts',
        name: 'PromptManagement',
        component: () => import('pages/PromptManagementPage.vue'),
      },
      {
        path: 'output-formats',
        name: 'OutputFormatManagement',
        component: () => import('pages/OutputFormatManagementPage.vue'),
      },
      {
        path: 'data-boost',
        name: 'DataBoost',
        component: () => import('pages/DataBoostPage.vue'),
      },
      {
        path: 'model-finetune',
        name: 'ModelFinetune',
        component: () => import('pages/ModelFinetunePage.vue'),
      },
      {
        path: 'model-infer',
        name: 'ModelInfer',
        component: () => import('pages/ModelInferPage.vue'),
      },
    ],
  },
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
  },
];

export default routes;

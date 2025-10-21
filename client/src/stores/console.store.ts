import { defineStore } from 'pinia';
import { ref } from 'vue';

export interface ConsoleLog {
  id: string;
  timestamp: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  category?: string; // Optional category to group logs by component
}

export const useConsoleStore = defineStore('console', () => {
  // State
  const logs = ref<ConsoleLog[]>([]);
  const maxLogs = ref(500); // Maximum number of logs to keep in memory

  // Actions
  function addLog(type: ConsoleLog['type'], message: string, category?: string) {
    const timestamp = new Date().toLocaleTimeString();
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const newLog: ConsoleLog = {
      id,
      timestamp,
      type,
      message,
      category,
    };

    logs.value.push(newLog);

    // Keep only the most recent logs to prevent memory issues
    if (logs.value.length > maxLogs.value) {
      logs.value = logs.value.slice(-maxLogs.value);
    }
  }

  function clearLogs() {
    logs.value = [];
  }

  function clearLogsByCategory(category: string) {
    logs.value = logs.value.filter(log => log.category !== category);
  }

  function getLogsByCategory(category: string) {
    return logs.value.filter(log => log.category === category);
  }

  return {
    // State
    logs,
    maxLogs,

    // Actions
    addLog,
    clearLogs,
    clearLogsByCategory,
    getLogsByCategory,
  };
});

"use server";

import { searchTasks } from "@/lib/data/tasks";

export async function searchTasksAction(query: string) {
  return searchTasks(query);
}

"use client";
import type { Scenario } from "@/lib/sim/types";
import { lsGet, lsSet } from "@/lib/store";

export interface ProjectScenario { id: string; scenario: Scenario; addedAt: string; lastRunAt?: string; }
export interface Project { id: string; name: string; description: string; createdAt: string; scenarios: ProjectScenario[]; }
const KEY = "ea.projects.v1";
export const readProjects = () => lsGet<Project[]>(KEY, []);
export const writeProjects = (projects: Project[]) => lsSet(KEY, projects);
export const newProject = (name: string, description: string): Project => ({ id: crypto.randomUUID(), name, description, createdAt: new Date().toISOString(), scenarios: [] });
export const addScenario = (project: Project, scenario: Scenario): Project => ({ ...project, scenarios: [...project.scenarios, { id: crypto.randomUUID(), scenario, addedAt: new Date().toISOString() }] });

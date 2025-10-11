import { z } from "zod";

/**
 * Schema for a part within a contract module.
 * Parts represent sub-components or exportable elements (e.g., functions, classes, exports).
 */
export const PartSchema = z.object({
  /** Unique identifier for the part within the module */
  id: z.string().min(1, "Part id is required"),
  /** Type of the part (e.g., string, function, class, interface) */
  type: z.string().min(1, "Part type is required"),
});

/**
 * Schema for a part reference within a dependency.
 * Must match the part definition in the referenced module.
 */
export const DependencyPartSchema = z.object({
  /** Must match the id of a part in the referenced module */
  part_id: z.string().min(1, "Part id is required"),
  /** Must match the type of the part in the referenced module */
  type: z.string().min(1, "Part type is required"),
});

/**
 * Schema for a module dependency.
 * Represents a unidirectional dependency on another module.
 */
export const DependencySchema = z.object({
  /** Reference to another module's id */
  module_id: z.string().min(1, "Module id is required"),
  /** List of specific parts from the referenced module that this module uses */
  parts: z
    .array(DependencyPartSchema)
    .min(1, "At least one part must be specified"),
});

/**
 * Main contract schema.
 * Represents a complete module contract with its parts and dependencies.
 */
export const ContractSchema = z.object({
  /** Unique identifier for the contract/module */
  id: z.string().min(1, "Contract id is required"),
  /** Module type (e.g., controller, service, component) */
  type: z.string().min(1, "Contract type is required"),
  /** Category classification (e.g., api, service, frontend) */
  category: z.string().min(1, "Contract category is required"),
  /** Human-readable description of the module's purpose */
  description: z.string().min(1, "Contract description is required"),
  /** Optional array of sub-components within this module */
  parts: z.array(PartSchema).optional(),
  /** Optional array of dependencies on other modules */
  dependencies: z.array(DependencySchema).optional(),
});

// Type exports for TypeScript usage
export type Part = z.infer<typeof PartSchema>;
export type DependencyPart = z.infer<typeof DependencyPartSchema>;
export type Dependency = z.infer<typeof DependencySchema>;
export type Contract = z.infer<typeof ContractSchema>;

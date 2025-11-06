import { ApiProperty } from "@nestjs/swagger";

/**
 * DTO for a part used in a dependency
 */
export class DependencyPartDto {
  @ApiProperty({
    description: "Part ID",
    example: "getUserById",
  })
  part_id: string;

  @ApiProperty({
    description: "Part type",
    example: "function",
  })
  type: string;
}

/**
 * DTO for outgoing dependency (module that this module depends on)
 */
export class OutgoingDependencyDto {
  @ApiProperty({
    description: "Module ID that this module depends on",
    example: "users-service",
  })
  module_id: string;

  @ApiProperty({
    description: "Parts from the dependency module that this module uses",
    type: [DependencyPartDto],
  })
  parts: DependencyPartDto[];
}

/**
 * DTO for incoming dependency (module that depends on this module)
 */
export class IncomingDependencyDto {
  @ApiProperty({
    description: "Module ID that depends on this module",
    example: "users-controller",
  })
  module_id: string;

  @ApiProperty({
    description: "Parts from this module that the dependent module uses",
    type: [DependencyPartDto],
  })
  parts: DependencyPartDto[];
}

/**
 * DTO for module relations response
 */
export class ModuleRelationsResponseDto {
  @ApiProperty({
    description: "The module ID being queried",
    example: "users-service",
  })
  module_id: string;

  @ApiProperty({
    description: "Outgoing dependencies - modules that this module depends on",
    type: [OutgoingDependencyDto],
  })
  outgoing_dependencies: OutgoingDependencyDto[];

  @ApiProperty({
    description:
      "Incoming dependencies - modules that depend on this module and which parts they use",
    type: [IncomingDependencyDto],
  })
  incoming_dependencies: IncomingDependencyDto[];
}

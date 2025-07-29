import { z } from 'zod';

// Govee API Capability schema - permissive for parsing
export const GoveeCapabilitySchema = z
  .object({
    type: z.string().optional().nullable(),
    instance: z.string().optional().nullable(),
    parameters: z
      .object({
        dataType: z.string(),
        options: z
          .array(
            z.object({
              name: z.string(),
              value: z.unknown(),
            })
          )
          .optional(),
      })
      .optional(),
  })
  .passthrough();

// Individual device response schema - permissive for parsing
export const GoveeDeviceResponseSchema = z
  .object({
    device: z.string().optional().nullable(),
    sku: z.string().optional().nullable(),
    deviceName: z.string().optional().nullable(),
    capabilities: z.array(GoveeCapabilitySchema).optional().nullable(), // Keep null as null for filtering
  })
  .passthrough();

// Full devices API response schema
export const GoveeDevicesResponseSchema = z.object({
  code: z.number(),
  message: z.string(),
  data: z.array(GoveeDeviceResponseSchema),
});

// Device state capability schema
export const GoveeStateCapabilitySchema = z.object({
  type: z.string().min(1, 'State capability type must be a non-empty string'),
  instance: z.string().min(1, 'State capability instance must be a non-empty string'),
  state: z.object({
    value: z.unknown(),
  }),
});

// Device state API response schema
export const GoveeStateResponseSchema = z.object({
  code: z.number(),
  message: z.string(),
  data: z.object({
    device: z.string().min(1, 'Device ID must be a non-empty string'),
    sku: z.string().min(1, 'SKU must be a non-empty string'),
    capabilities: z.array(GoveeStateCapabilitySchema),
  }),
});

// Command API response schema
export const GoveeCommandResponseSchema = z.object({
  code: z.number(),
  message: z.string(),
  data: z.unknown().optional(),
});

// Type exports for use in the repository
export type GoveeCapability = z.infer<typeof GoveeCapabilitySchema>;
export type GoveeDeviceResponse = z.infer<typeof GoveeDeviceResponseSchema>;
export type GoveeDevicesResponse = z.infer<typeof GoveeDevicesResponseSchema>;
export type GoveeStateCapability = z.infer<typeof GoveeStateCapabilitySchema>;
export type GoveeStateResponse = z.infer<typeof GoveeStateResponseSchema>;
export type GoveeCommandResponse = z.infer<typeof GoveeCommandResponseSchema>;

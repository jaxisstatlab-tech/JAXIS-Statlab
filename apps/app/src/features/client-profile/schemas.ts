import { z } from "zod";

export const ClientProfileSchema = z.object({
  institutionSchool: z.string().trim().min(2, "Enter your school or university.").max(100, "Keep this under 100 characters."),
  academicProgram: z.string().trim().min(2, "Enter your program.").max(100, "Keep this under 100 characters."),
  contactNumber: z.string().trim().min(5, "Enter your mobile number.").max(30, "That number looks too long."),
  region: z.string().min(2, "Choose your region."),
});

export type ClientProfileFormData = z.infer<typeof ClientProfileSchema>;

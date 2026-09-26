"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

import { createListing, type CreateListingValues } from "@/app/actions/listings";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";

export function ListingForm() {
  const router = useRouter();
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateListingValues>({
    defaultValues: { type: "seeking", title: "", description: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setResult(null);
    const response = await createListing(values);
    setResult(response);
    if (response.ok) {
      reset();
      router.refresh();
    }
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6" noValidate>
      <FieldGroup>
        <Field data-invalid={Boolean(errors.type)}>
          <FieldLabel htmlFor="type">I want to</FieldLabel>
          <NativeSelect
            id="type"
            aria-invalid={Boolean(errors.type)}
            {...register("type", { required: "Choose seeking or offering help." })}
          >
            <option value="seeking">Find help</option>
            <option value="offering">Offer help</option>
          </NativeSelect>
          {errors.type && <FieldError>{errors.type.message}</FieldError>}
        </Field>

        <Field data-invalid={Boolean(errors.title)}>
          <FieldLabel htmlFor="title">Title</FieldLabel>
          <Input
            id="title"
            placeholder="e.g. Looking for help with calculus"
            aria-invalid={Boolean(errors.title)}
            maxLength={100}
            {...register("title", {
              required: "Add a title for your listing.",
              minLength: { value: 5, message: "Use at least 5 characters." },
              maxLength: { value: 100, message: "Keep the title under 100 characters." },
              validate: (value) => Boolean(value.trim()) || "The title cannot be blank.",
            })}
          />
          {errors.title ? (
            <FieldError>{errors.title.message}</FieldError>
          ) : (
            <FieldDescription>Use 5 to 100 characters.</FieldDescription>
          )}
        </Field>

        <Field data-invalid={Boolean(errors.description)}>
          <FieldLabel htmlFor="description">Description</FieldLabel>
          <Textarea
            id="description"
            placeholder="Share a little about the course, topic, or skill and what kind of help would be useful."
            aria-invalid={Boolean(errors.description)}
            maxLength={2000}
            {...register("description", {
              required: "Add a description for your listing.",
              minLength: {
                value: 20,
                message: "Use at least 20 characters so students know what you need.",
              },
              maxLength: { value: 2000, message: "Keep the description under 2,000 characters." },
              validate: (value) => Boolean(value.trim()) || "The description cannot be blank.",
            })}
          />
          {errors.description ? (
            <FieldError>{errors.description.message}</FieldError>
          ) : (
            <FieldDescription>Use 20 to 2,000 characters.</FieldDescription>
          )}
        </Field>
      </FieldGroup>

      {result && (
        <p
          role={result.ok ? "status" : "alert"}
          className={
            result.ok ? "text-sm font-medium text-primary" : "text-sm font-medium text-destructive"
          }
        >
          {result.message}
        </p>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Publishing…" : "Publish listing"}
      </Button>
    </form>
  );
}

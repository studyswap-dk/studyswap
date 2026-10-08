"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

import { createPost } from "@/app/actions/posts";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import {
  DESCRIPTION_MAX_LENGTH,
  DESCRIPTION_MIN_LENGTH,
  type NewPost,
  TITLE_MAX_LENGTH,
  TITLE_MIN_LENGTH,
  validateDescription,
  validateTitle,
  validateType,
} from "@/domain/post";

export function PostForm() {
  const router = useRouter();
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<NewPost>({
    defaultValues: { type: "seeking", title: "", description: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setResult(null);
    const response = await createPost(values);
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
            {...register("type", { validate: (value) => validateType(value) ?? true })}
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
            maxLength={TITLE_MAX_LENGTH}
            {...register("title", { validate: (value) => validateTitle(value) ?? true })}
          />
          {errors.title ? (
            <FieldError>{errors.title.message}</FieldError>
          ) : (
            <FieldDescription>
              Use {TITLE_MIN_LENGTH} to {TITLE_MAX_LENGTH} characters.
            </FieldDescription>
          )}
        </Field>

        <Field data-invalid={Boolean(errors.description)}>
          <FieldLabel htmlFor="description">Description</FieldLabel>
          <Textarea
            id="description"
            placeholder="Share a little about the course, topic, or skill and what kind of help would be useful."
            aria-invalid={Boolean(errors.description)}
            maxLength={DESCRIPTION_MAX_LENGTH}
            {...register("description", {
              validate: (value) => validateDescription(value) ?? true,
            })}
          />
          {errors.description ? (
            <FieldError>{errors.description.message}</FieldError>
          ) : (
            <FieldDescription>
              Use {DESCRIPTION_MIN_LENGTH} to {DESCRIPTION_MAX_LENGTH.toLocaleString("en-US")}{" "}
              characters.
            </FieldDescription>
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
        {isSubmitting ? "Publishing…" : "Publish post"}
      </Button>
    </form>
  );
}

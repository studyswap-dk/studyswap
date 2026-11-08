"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

import { createPost, type CreatePostResult } from "@/app/actions/posts";
import { useTexts } from "@/components/texts/texts-provider";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import {
  DESCRIPTION_MAX_LENGTH,
  DESCRIPTION_MIN_LENGTH,
  type NewPost,
  type PostField,
  type PostFieldError,
  TITLE_MAX_LENGTH,
  TITLE_MIN_LENGTH,
  validateDescription,
  validateTitle,
  validateType,
} from "@/domain/post";
import type { Texts } from "@/lib/texts";
import { fill } from "@/lib/texts/fill";

// NF1: the text for a code from domain/post.ts, with the limits filled in. The numbers
// are not formatted for a language here, because only the root layout knows it.
function fieldText(texts: Texts["post"], field: PostField, code: PostFieldError): string {
  if (field === "type") return texts.type.required;
  const limits =
    field === "title"
      ? { min: TITLE_MIN_LENGTH, max: TITLE_MAX_LENGTH }
      : { min: DESCRIPTION_MIN_LENGTH, max: DESCRIPTION_MAX_LENGTH };
  return fill(texts[field][code], limits);
}

export function PostForm() {
  const router = useRouter();
  const texts = useTexts().post;
  const [result, setResult] = useState<CreatePostResult | null>(null);
  // The same rules as the server, with the text for the code, or true when valid.
  const check = (field: PostField, code: PostFieldError | null) =>
    code === null ? true : fieldText(texts, field, code);
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
            {...register("type", { validate: (value) => check("type", validateType(value)) })}
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
            {...register("title", { validate: (value) => check("title", validateTitle(value)) })}
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
              validate: (value) => check("description", validateDescription(value)),
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
          {result.ok
            ? texts.saved
            : result.code === "failed"
              ? texts.failed
              : fieldText(texts, result.field, result.code)}
        </p>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Publishing…" : "Publish post"}
      </Button>
    </form>
  );
}

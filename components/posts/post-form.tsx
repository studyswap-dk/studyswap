"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LoaderCircle, X } from "lucide-react";
import { useForm } from "react-hook-form";

import { createPost, type CreatePostResult } from "@/app/actions/posts";
import { useTexts } from "@/components/texts/texts-provider";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import {
  DESCRIPTION_MAX_LENGTH,
  DESCRIPTION_MIN_LENGTH,
  MAX_TAGS_PER_POST,
  MAX_TAG_NAME_LENGTH,
  type NewPost,
  type PostField,
  type PostFieldError,
  type PostTagError,
  TITLE_MAX_LENGTH,
  TITLE_MIN_LENGTH,
  validateDescription,
  validatePostTags,
  validateTitle,
  validateType,
} from "@/domain/post";
import type { Texts } from "@/lib/texts";
import { fill } from "@/lib/texts/fill";
import { cn } from "@/lib/utils";

type PostFormValues = NewPost & { tags: string };

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

function tagFieldText(texts: Texts["post"], code: PostTagError): string {
  return fill(texts.tags[code], { max: MAX_TAG_NAME_LENGTH, maxTags: MAX_TAGS_PER_POST });
}

export function PostForm() {
  const router = useRouter();
  const texts = useTexts().post;
  const [result, setResult] = useState<CreatePostResult | null>(null);
  const [tagNames, setTagNames] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [countdown, setCountdown] = useState(5);
  // The same rules as the server, with the text for the code, or true when valid.
  const check = (field: PostField, code: PostFieldError | null) =>
    code === null ? true : fieldText(texts, field, code);
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<PostFormValues>({
    defaultValues: { type: "seeking", title: "", description: "", tags: "" },
  });

  useEffect(() => {
    if (!result?.ok || countdown === 0) return;
    const timeoutId = window.setTimeout(() => {
      setCountdown((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => window.clearTimeout(timeoutId);
  }, [countdown, result]);

  useEffect(() => {
    if (result?.ok && countdown === 0) {
      router.replace("/posts/" + result.postId);
    }
  }, [countdown, result, router]);

  function updateTagNames(next: string[]) {
    setTagNames(next);
    setValue("tags", next.join(", "), { shouldDirty: true, shouldValidate: true });
  }

  function addTagNames(values: string[]) {
    const next = [...tagNames];
    for (const value of values) {
      const name = value.trim().replace(/\s+/g, " ");
      if (!name || next.some((tag) => tag.toLowerCase() === name.toLowerCase())) continue;
      next.push(name);
    }
    if (next.length !== tagNames.length) updateTagNames(next);
  }

  function removeTag(tagToRemove: string) {
    updateTagNames(tagNames.filter((tag) => tag !== tagToRemove));
  }

  function onTagInputChange(value: string) {
    const parts = value.split(",");
    if (parts.length === 1) {
      setTagInput(value);
      return;
    }
    const draft = parts.pop() ?? "";
    addTagNames(parts);
    setTagInput(draft);
  }

  const onSubmit = handleSubmit(async (values) => {
    setResult(null);
    const pendingTag = tagInput.trim().replace(/\s+/g, " ");
    const submittedTagNames =
      pendingTag && !tagNames.some((tag) => tag.toLowerCase() === pendingTag.toLowerCase())
        ? [...tagNames, pendingTag]
        : tagNames;
    if (submittedTagNames.length !== tagNames.length) {
      updateTagNames(submittedTagNames);
    }
    if (pendingTag) {
      setTagInput("");
    }
    const response = await createPost({
      ...values,
      tags: submittedTagNames.join(", "),
    });
    if (response.ok) {
      reset();
      setTagNames([]);
      setTagInput("");
      setCountdown(5);
    }
    setResult(response);
  });

  if (result?.ok) {
    return (
      <div className="flex flex-col gap-4">
        <output className="text-sm font-medium text-primary">{texts.saved}</output>
        <FieldDescription>
          {countdown > 0
            ? "Opening your post in " + countdown + (countdown === 1 ? " second…" : " seconds…")
            : "Opening your post…"}
        </FieldDescription>
        <Link
          href={"/posts/" + result.postId}
          className={cn(buttonVariants({ size: "lg" }), "w-full")}
        >
          Go to new post
        </Link>
      </div>
    );
  }

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

        <Field data-invalid={Boolean(errors.tags)}>
          <FieldLabel htmlFor="tag-entry">Tags</FieldLabel>
          {tagNames.length > 0 ? (
            <ul aria-label="Selected tags" className="flex flex-wrap gap-2">
              {tagNames.map((tag) => (
                <li key={tag} className="max-w-full">
                  <Badge
                    variant="secondary"
                    className="max-w-full items-start text-left break-words whitespace-normal"
                  >
                    <span className="min-w-0 break-words">{tag}</span>
                    <Button
                      type="button"
                      size="icon-xs"
                      variant="ghost"
                      aria-label={"Remove " + tag}
                      onClick={() => removeTag(tag)}
                      className="-mr-1 shrink-0"
                    >
                      <X aria-hidden="true" />
                    </Button>
                  </Badge>
                </li>
              ))}
            </ul>
          ) : null}
          <Input
            id="tag-entry"
            placeholder="Type a tag and press comma"
            value={tagInput}
            aria-invalid={Boolean(errors.tags)}
            onChange={(event) => onTagInputChange(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === "," || (event.key === "Enter" && tagInput.trim())) {
                event.preventDefault();
                addTagNames([tagInput]);
                setTagInput("");
              } else if (event.key === "Backspace" && !tagInput && tagNames.length > 0) {
                removeTag(tagNames[tagNames.length - 1]);
              }
            }}
          />
          <Input
            type="hidden"
            {...register("tags", {
              validate: (value) => {
                const validation = validatePostTags(value);
                return validation.ok || tagFieldText(texts, validation.code);
              },
            })}
          />
          {errors.tags ? (
            <FieldError>{errors.tags.message}</FieldError>
          ) : (
            <FieldDescription>
              Press comma or Enter to add a tag. Use up to {MAX_TAGS_PER_POST} tags, with up to{" "}
              {MAX_TAG_NAME_LENGTH} characters each.
            </FieldDescription>
          )}
        </Field>
      </FieldGroup>

      {result && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {result.code === "failed"
            ? texts.failed
            : result.field === "tags"
              ? tagFieldText(texts, result.code)
              : fieldText(texts, result.field, result.code)}
        </p>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? <LoaderCircle data-icon="inline-start" className="animate-spin" /> : null}
        {isSubmitting ? "Publishing…" : "Publish post"}
      </Button>
    </form>
  );
}

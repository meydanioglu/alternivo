"use client";

import { CircleAlert, CircleCheck, Loader2, PlugZap } from "lucide-react";
import { useActionState, useState, useTransition } from "react";
import type { FormState } from "@/app/actions";
import { removeAiKeyAction, saveAiSettingsAction, testAiAction } from "@/app/admin/settings/actions";
import { ActionButton } from "@/components/admin/admin-ui";
import { Field, FormMessage, SubmitButton, TextInput } from "@/components/forms/form-kit";
import { buttonClass } from "@/components/ui/styles";

export interface AiSettingsView {
  configured: boolean;
  source: "panel" | "env" | null;
  keyHint: string | null;
  model: string;
  updatedAt: string | null;
}

export function AiSettingsForm({ view }: { view: AiSettingsView }) {
  const [state, action] = useActionState(saveAiSettingsAction, {} as FormState);
  const [test, setTest] = useState<{ ok: boolean; message: string } | null>(null);
  const [testing, startTest] = useTransition();

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-4 text-sm">
        {view.configured ? (
          <>
            <CircleCheck className="size-5 text-success" aria-hidden="true" />
            <span>
              Anahtar tanımlı <span className="font-mono text-muted">{view.keyHint}</span>{" "}
              <span className="text-muted">({view.source === "panel" ? "panelden" : "sunucu .env dosyasından"})</span>
            </span>
          </>
        ) : (
          <>
            <CircleAlert className="size-5 text-warning" aria-hidden="true" />
            <span>Anahtar tanımlı değil — içerik üretimi duruyor.</span>
          </>
        )}
        <span className="ml-auto text-muted">Model: {view.model}</span>
      </div>

      <form action={action} className="flex flex-col gap-4">
        <FormMessage state={state} />
        <Field
          label={view.configured ? "Yeni API anahtarı" : "OpenAI API anahtarı"}
          name="apiKey"
          optional={view.configured}
          hint="platform.openai.com → API keys. Şifrelenerek saklanır ve bir daha gösterilmez; boş bırakırsanız mevcut anahtar korunur."
        >
          <TextInput name="apiKey" type="password" autoComplete="off" spellCheck={false} placeholder="sk-..." />
        </Field>
        <Field label="Model" name="model" hint="OpenAI hesabınızda erişiminiz olan bir model adı. Boş bırakılırsa varsayılan kullanılır.">
          <TextInput name="model" defaultValue={view.model} maxLength={60} spellCheck={false} />
        </Field>
        <div className="flex flex-wrap gap-2">
          <SubmitButton>Kaydet</SubmitButton>
          <button
            type="button"
            disabled={testing || !view.configured}
            onClick={() => startTest(async () => setTest(await testAiAction()))}
            className={buttonClass("outline", "md", "disabled:opacity-60")}
          >
            {testing ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <PlugZap className="size-4" aria-hidden="true" />}
            Bağlantıyı test et
          </button>
          {view.source === "panel" && (
            <ActionButton action={removeAiKeyAction} variant="ghost" className="text-danger" confirm="Paneldeki API anahtarı silinsin mi?">
              Anahtarı sil
            </ActionButton>
          )}
        </div>
      </form>

      {test && (
        <p
          role="status"
          className={
            test.ok
              ? "rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm text-success"
              : "rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger"
          }
        >
          {test.message}
        </p>
      )}
    </div>
  );
}

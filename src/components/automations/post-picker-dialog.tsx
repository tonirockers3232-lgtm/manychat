"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { listAccountMedia } from "@/lib/actions/instagram-media";
import type { InstagramMedia } from "@/lib/meta/instagram-api";
import { ImageOff, Loader2 } from "lucide-react";

export function PostPickerDialog({
  instagramAccountId,
  onSelect,
  children,
}: {
  instagramAccountId: string | null;
  onSelect: (media: InstagramMedia) => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [media, setMedia] = useState<InstagramMedia[] | null>(null);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next && !media && instagramAccountId) {
      setLoading(true);
      setError(null);
      listAccountMedia(instagramAccountId)
        .then(setMedia)
        .catch(() => setError("Não foi possível carregar as publicações. Tente novamente."))
        .finally(() => setLoading(false));
    }
  }

  function handleSelect(item: InstagramMedia) {
    onSelect(item);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {children}
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Escolher publicação</DialogTitle>
          <DialogDescription>
            O gatilho só dispara para comentários nesta publicação específica.
          </DialogDescription>
        </DialogHeader>

        {!instagramAccountId && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Selecione uma conta do Instagram para esta automação primeiro.
          </p>
        )}

        {instagramAccountId && loading && (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando publicações...
          </div>
        )}

        {error && <p className="py-4 text-center text-sm text-destructive">{error}</p>}

        {media && media.length === 0 && !loading && (
          <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma publicação encontrada.</p>
        )}

        {media && media.length > 0 && (
          <div className="grid max-h-[60vh] grid-cols-3 gap-3 overflow-y-auto sm:grid-cols-4">
            {media.map((item) => {
              const thumb = item.thumbnail_url ?? item.media_url;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelect(item)}
                  className="group relative aspect-square overflow-hidden rounded-md border hover:ring-2 hover:ring-primary"
                  title={item.caption?.slice(0, 80)}
                >
                  {thumb ? (
                    <Image src={thumb} alt={item.caption?.slice(0, 60) ?? "Publicação"} fill unoptimized className="object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-muted">
                      <ImageOff className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  <span className="absolute inset-x-0 bottom-0 truncate bg-black/60 px-1.5 py-1 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                    {item.caption?.slice(0, 40) || item.media_type}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function PostPreviewCard({
  thumbnail,
  caption,
  permalink,
  onClear,
  triggerButton,
}: {
  thumbnail?: string;
  caption?: string;
  permalink?: string;
  onClear: () => void;
  triggerButton: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 rounded-md border p-2">
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded bg-muted">
        {thumbnail ? (
          <Image src={thumbnail} alt={caption?.slice(0, 60) ?? "Publicação"} fill unoptimized className="object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ImageOff className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        {permalink ? (
          <a href={permalink} target="_blank" rel="noreferrer" className="block truncate text-xs font-medium text-primary hover:underline">
            {caption?.slice(0, 50) || "Ver publicação"}
          </a>
        ) : (
          <p className="truncate text-xs font-medium">{caption?.slice(0, 50) || "Publicação selecionada"}</p>
        )}
        <div className="mt-1 flex gap-2">
          {triggerButton}
          <Button type="button" variant="ghost" size="sm" className="h-6 px-1.5 text-xs" onClick={onClear}>
            Aplicar a qualquer post
          </Button>
        </div>
      </div>
    </div>
  );
}

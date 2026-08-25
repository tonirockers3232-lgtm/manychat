"use client";

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ContactStatusSelect } from "@/components/contacts/contact-status-select";
import { STATUS_LABEL } from "@/lib/contact-status";
import { matchesSegment, type ContactWithRelations } from "@/lib/segment-match";
import type { Segment } from "@/types/database";
import { Users } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const ALL = "__all__";

export function ContactsList({
  contacts,
  segments,
  tagNames,
}: {
  contacts: ContactWithRelations[];
  segments: Segment[];
  tagNames: string[];
}) {
  const [search, setSearch] = useState("");
  const [segmentId, setSegmentId] = useState(ALL);
  const [status, setStatus] = useState(ALL);
  const [tag, setTag] = useState(ALL);

  const filtered = useMemo(() => {
    const segment = segments.find((s) => s.id === segmentId);
    const needle = search.trim().toLowerCase();

    return contacts.filter((c) => {
      if (needle && !(c.username ?? "").toLowerCase().includes(needle)) return false;
      if (status !== ALL && c.status !== status) return false;
      if (tag !== ALL && !c.tagNames.includes(tag)) return false;
      if (segment && !matchesSegment(c, segment.filter_rules)) return false;
      return true;
    });
  }, [contacts, search, segmentId, status, tag, segments]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por @usuário"
          className="w-56"
        />
        <Select value={segmentId} onValueChange={setSegmentId}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Segmento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos os segmentos</SelectItem>
            {segments.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos os status</SelectItem>
            {Object.entries(STATUS_LABEL).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={tag} onValueChange={setTag}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Tag" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todas as tags</SelectItem>
            {tagNames.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <p className="text-xs text-muted-foreground">
        {filtered.length} de {contacts.length} {contacts.length === 1 ? "contato" : "contatos"}
      </p>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-16 text-center text-sm text-muted-foreground">
              <Users className="h-8 w-8" />
              {contacts.length === 0 ? "Nenhum contato ainda." : "Nenhum contato bate com esses filtros."}
            </div>
          )}
          {filtered.map((contact) => (
            <div key={contact.id} className="flex items-center gap-3 border-b px-4 py-3 last:border-0">
              <Avatar>
                <AvatarImage src={contact.profile_pic_url ?? undefined} />
                <AvatarFallback>{(contact.username ?? "??").slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">@{contact.username ?? "desconhecido"}</p>
                <p className="text-xs text-muted-foreground">
                  Última interação{" "}
                  {formatDistanceToNow(new Date(contact.last_interaction_at), { addSuffix: true, locale: ptBR })}
                  {(contact.phone || contact.email) && " · "}
                  {[contact.phone, contact.email].filter(Boolean).join(" · ")}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-1">
                {contact.tagNames.map((name) => (
                  <Badge key={name} variant="secondary">
                    {name}
                  </Badge>
                ))}
              </div>
              <ContactStatusSelect contactId={contact.id} status={contact.status} />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

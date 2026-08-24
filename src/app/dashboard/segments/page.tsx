import { getCurrentOrganization } from "@/lib/data/organizations";
import { listSegments, listContactsWithRelations, matchesSegment } from "@/lib/data/segments";
import { listCustomFields } from "@/lib/data/custom-fields";
import { listTags } from "@/lib/data/contacts-list";
import { SegmentsView } from "@/components/segments/segments-view";

export default async function SegmentsPage() {
  const organization = await getCurrentOrganization();
  const [segments, contacts, customFields, tags] = await Promise.all([
    listSegments(organization!.id),
    listContactsWithRelations(organization!.id),
    listCustomFields(organization!.id),
    listTags(organization!.id),
  ]);

  const segmentsWithMatches = segments.map((segment) => ({
    segment,
    matches: contacts.filter((c) => matchesSegment(c, segment.filter_rules)),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Segmentos</h1>
        <p className="text-sm text-muted-foreground">
          Agrupe contatos por tags, status ou campos personalizados para nutrir ou priorizar leads.
        </p>
      </div>

      <SegmentsView
        organizationId={organization!.id}
        segmentsWithMatches={segmentsWithMatches}
        customFields={customFields}
        tagNames={tags.map((t) => t.name)}
      />
    </div>
  );
}

export const metadata = { title: "Exclusão de Dados" };

export default function DataDeletionPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16 text-sm leading-relaxed text-neutral-700">
      <h1 className="mb-6 text-2xl font-semibold text-neutral-900">Solicitação de Exclusão de Dados</h1>

      <p className="mb-4">
        Você pode solicitar a exclusão permanente de todos os dados associados à sua conta do
        Instagram nesta plataforma (perfil, mensagens, comentários, tags e histórico de
        automações) a qualquer momento.
      </p>

      <h2 className="mb-2 mt-8 text-lg font-medium text-neutral-900">Como solicitar</h2>
      <ol className="list-decimal space-y-2 pl-5">
        <li>
          Pelo painel: acesse <span className="font-medium">Configurações → Conta → Excluir meus dados</span>{" "}
          enquanto estiver autenticado.
        </li>
        <li>
          Ou envie um e-mail para o endereço de suporte informado no app, com o assunto
          &quot;Exclusão de dados&quot; e o @ da conta do Instagram conectada.
        </li>
      </ol>

      <h2 className="mb-2 mt-8 text-lg font-medium text-neutral-900">Prazo</h2>
      <p className="mb-4">
        A exclusão é processada em até 30 dias. Dados de faturamento podem ser mantidos por
        período adicional quando exigido por obrigação legal.
      </p>

      <h2 className="mb-2 mt-8 text-lg font-medium text-neutral-900">O que é removido</h2>
      <ul className="list-disc space-y-1 pl-5">
        <li>Token de acesso da conta do Instagram (revogado imediatamente).</li>
        <li>Histórico de conversas, comentários e execuções de automação.</li>
        <li>Contatos, tags e segmentos associados à organização.</li>
      </ul>
    </main>
  );
}

export const metadata = { title: "Política de Privacidade" };

export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16 text-sm leading-relaxed text-neutral-700">
      <h1 className="mb-6 text-2xl font-semibold text-neutral-900">Política de Privacidade</h1>

      <p className="mb-4">
        Esta plataforma conecta contas comerciais do Instagram por meio da API oficial da Meta
        para automatizar respostas a comentários e mensagens diretas (DM). Esta página descreve
        quais dados coletamos, como usamos e como você pode solicitar sua remoção.
      </p>

      <h2 className="mb-2 mt-8 text-lg font-medium text-neutral-900">Dados coletados</h2>
      <ul className="list-disc space-y-1 pl-5">
        <li>Dados de perfil público da conta do Instagram conectada (nome de usuário, foto, ID).</li>
        <li>Conteúdo de mensagens diretas e comentários trocados com a conta conectada.</li>
        <li>Tokens de acesso à API da Meta, armazenados de forma criptografada.</li>
        <li>Dados de uso da plataforma pelo usuário que administra a conta (e-mail, organização).</li>
      </ul>

      <h2 className="mb-2 mt-8 text-lg font-medium text-neutral-900">Uso dos dados</h2>
      <p className="mb-4">
        Os dados são usados exclusivamente para operar as automações configuradas pelo próprio
        usuário (responder comentários, enviar DMs, aplicar tags) e para exibir o histórico de
        conversas na caixa de entrada. Não vendemos nem compartilhamos dados com terceiros para
        fins de publicidade.
      </p>

      <h2 className="mb-2 mt-8 text-lg font-medium text-neutral-900">Exclusão de dados</h2>
      <p className="mb-4">
        Para solicitar a exclusão completa dos seus dados, acesse{" "}
        <a href="/exclusao-de-dados" className="underline">
          esta página
        </a>{" "}
        ou envie um e-mail para o contato configurado no aplicativo.
      </p>

      <h2 className="mb-2 mt-8 text-lg font-medium text-neutral-900">Contato</h2>
      <p>Dúvidas sobre esta política podem ser enviadas ao e-mail de suporte da organização.</p>
    </main>
  );
}

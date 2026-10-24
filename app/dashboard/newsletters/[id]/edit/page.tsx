import EditorPage from '../../editor';

export default async function EditNewsletterPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    return <EditorPage params={params} />;
}

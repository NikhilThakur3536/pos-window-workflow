import ReportDesignerPage from "./ReportDesignerPage";

export default function Page({ params }: { params: { reportId: string } }) {
    return <ReportDesignerPage reportId={params.reportId} />;
}

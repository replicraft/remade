import RequestActions from "./RequestActions";
import RequestActivityProvider from "./RequestActivityProvider";

export default function RequestEngagement({ original }: { original: string }) {
	return (
		<RequestActivityProvider originals={[original]}>
			<RequestActions original={original} />
		</RequestActivityProvider>
	);
}

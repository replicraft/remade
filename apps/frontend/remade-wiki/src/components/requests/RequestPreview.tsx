import type { DirectoryRecord } from "../../lib/directory";
import DirectoryCard from "../catalog/DirectoryCard";
import RequestActions from "./RequestActions";
import RequestActivityProvider from "./RequestActivityProvider";

export default function RequestPreview({
	records,
}: {
	records: DirectoryRecord[];
}) {
	return (
		<RequestActivityProvider>
			<div className="directory-grid">
				{records.map((record) => (
					<DirectoryCard
						actions={<RequestActions original={record.id} />}
						key={record.id}
						record={record}
					/>
				))}
			</div>
		</RequestActivityProvider>
	);
}

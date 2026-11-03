import { MAX_LOGBOOK_BYTES } from '@logbook/shared';
import { useState } from 'react';
import { Field } from './Field';

interface LogbookUploadProps {
  /** The server's message for the file, shown in place of the hint. */
  error?: string;
  onChange: (file: File | null) => void;
}

const tooLarge = 'That file is larger than 3 MB. Choose a smaller one.';

/**
 * The logbook file input. A file over the limit is refused here, before anything is sent,
 * and the input is emptied so the file cannot be submitted by mistake.
 */
export function LogbookUpload({ error, onChange }: LogbookUploadProps) {
  const [sizeError, setSizeError] = useState<string | undefined>();
  const message = sizeError ?? error;

  return (
    <Field
      id="logbook"
      label="Logbook file"
      hint={message ? undefined : 'A plain text file, up to 3 MB.'}
      error={message}
    >
      {(control) => (
        <input
          {...control}
          type="file"
          accept=".txt,.log,text/plain"
          onChange={(event) => {
            const file = event.target.files?.[0] ?? null;
            if (file && file.size > MAX_LOGBOOK_BYTES) {
              event.target.value = '';
              setSizeError(tooLarge);
              onChange(null);
              return;
            }
            setSizeError(undefined);
            onChange(file);
          }}
        />
      )}
    </Field>
  );
}

from pathlib import Path
from html.parser import HTMLParser
import re

app = Path('app.js').read_text(encoding='utf-8')
index = Path('index.html').read_text(encoding='utf-8')
style = Path('style.css').read_text(encoding='utf-8')
sw = Path('service-worker.js').read_text(encoding='utf-8')

checks = {
    'internal build bumped': 'const HANA_APP_VERSION = "2.0.21";' in app,
    'visible version remains 2': 'const HANA_DISPLAY_VERSION = "2";' in app and 'data-hana-version>2</span>' in index,
    'meeting agenda template exists': 'id: "meeting-agenda"' in app,
    'meeting minutes template exists': 'id: "meeting-minutes"' in app,
    'old meeting markdown template removed': 'content: "## Agenda\\n\\n## Decisions\\n\\n## Notes"' not in app,
    'meeting model normalized': 'function normalizeMeetingData(data = {})' in app and 'meetingData: note.type === "meeting"' in app,
    'agenda rows structured': 'data-meeting-agenda-topic' in app and 'data-meeting-agenda-owner' in app and 'data-meeting-agenda-minutes' in app,
    'agenda fields present': all(x in index for x in ['meetingObjective','meetingAttendees','meetingAgendaItems','meetingDecisionsNeeded','meetingPrepMaterials']),
    'minutes fields present': all(x in index for x in ['meetingAbsent','meetingDiscussion','meetingDecisions','meetingNextDate','meetingNextTime','meetingPreparedBy']),
    'action items preserved': 'noteChecklistLabel' in index and 'Meeting → Actions' in app,
    'meeting search expanded': 'const meetingText=meeting?' in app,
    'meeting CSS present': 'HANA STRUCTURED MEETING TEMPLATES' in style,
    'cache bumped': 'hana-shell-v54' in sw and 'app.js?v=2.0.21' in sw and 'style.css?v=2.0.21' in sw,
    'index assets bumped': 'app.js?v=2.0.21' in index and 'style.css?v=2.0.21' in index,
}
failed = [name for name, ok in checks.items() if not ok]
if failed:
    raise SystemExit('Static QA failed: ' + ', '.join(failed))

class IdCollector(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = []
    def handle_starttag(self, tag, attrs):
        for key, value in attrs:
            if key == 'id' and value:
                self.ids.append(value)

parser = IdCollector()
parser.feed(index)
duplicates = sorted({value for value in parser.ids if parser.ids.count(value) > 1})
if duplicates:
    raise SystemExit('Duplicate HTML ids: ' + ', '.join(duplicates))

required_ids = {
    'meetingFieldsWrap','meetingKind','meetingDate','meetingStartTime','meetingEndTime','meetingLocation',
    'meetingFacilitator','meetingObjective','meetingAttendees','meetingAbsent','meetingAgendaItems',
    'meetingDecisionsNeeded','meetingPrepMaterials','meetingDiscussion','meetingDecisions',
    'meetingNextDate','meetingNextTime','meetingPreparedBy','noteToolbar','noteContentLabel','noteChecklistLabel'
}
missing_ids = sorted(required_ids - set(parser.ids))
if missing_ids:
    raise SystemExit('Missing meeting form ids: ' + ', '.join(missing_ids))

# Confirm the template branches create the correct structured note types.
if not re.search(r'templateId==="meeting-minutes".*?structuredType:isMinutes\?"meeting-minutes":"meeting-agenda"', app, re.S):
    raise SystemExit('Meeting template structuredType wiring missing')

# Backward compatibility: normal note content remains part of normalizeNote and is not discarded for meeting notes.
normalize_note = app[app.index('function normalizeNote(note = {})'):app.index('function normalizeReminder(reminder = {})')]
if 'content: String(note.content || "")' not in normalize_note:
    raise SystemExit('Legacy meeting note content preservation missing')

print('Hana structured meeting template QA passed:')
for name in checks:
    print(' -', name)
print(' - unique HTML ids')
print(' - legacy meeting content preserved')

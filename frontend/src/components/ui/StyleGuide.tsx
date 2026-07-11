import { useState } from 'react';
import type { ReactNode } from 'react';
import {
  BabyIcon,
  BellIcon,
  CalendarIcon,
  InboxIcon,
  MailIcon,
  SearchIcon,
  SparklesIcon,
  UserIcon,
} from 'lucide-react';
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  ConfirmDialog,
  EmptyState,
  Field,
  Input,
  Modal,
  PageHeader,
  SegmentedControl,
  Select,
  Skeleton,
  Spinner,
  StatusPill,
  Table,
  TableWrap,
  TBody,
  Tabs,
  TD,
  Textarea,
  TH,
  THead,
  TR,
  ToastProvider,
  useToast,
} from './index';

const swatches: Array<{ name: string; className: string; hex: string; text?: string }> = [
  { name: 'Brand / Pine', className: 'bg-brand', hex: '#0F766E', text: 'text-white' },
  { name: 'Brand strong', className: 'bg-brand-strong', hex: '#115E59', text: 'text-white' },
  { name: 'Brand soft', className: 'bg-brand-soft', hex: '#CCFBF1', text: 'text-brand-strong' },
  { name: 'Accent / Sun', className: 'bg-accent', hex: '#F59E0B', text: 'text-ink' },
  { name: 'Accent soft', className: 'bg-accent-soft', hex: '#FEF3C7', text: 'text-accent-strong' },
  { name: 'Canvas', className: 'bg-canvas', hex: '#F7F3EC', text: 'text-ink' },
  { name: 'Surface', className: 'bg-surface border border-line', hex: '#FFFFFF', text: 'text-ink' },
  { name: 'Ink', className: 'bg-ink', hex: '#26221E', text: 'text-white' },
  { name: 'Success', className: 'bg-success', hex: '#16A34A', text: 'text-white' },
  { name: 'Warning', className: 'bg-warning', hex: '#D97706', text: 'text-white' },
  { name: 'Danger', className: 'bg-danger', hex: '#DC2626', text: 'text-white' },
  { name: 'Muted', className: 'bg-muted', hex: '#857D72', text: 'text-white' },
];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="font-display text-lg font-bold text-ink">{title}</h2>
      {children}
    </section>
  );
}

function StyleGuideInner() {
  const toast = useToast();
  const [tab, setTab] = useState('applications');
  const [segment, setSegment] = useState<'all' | 'pending' | 'approved'>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <div className="mx-auto max-w-5xl space-y-12 px-6 py-10">
      <PageHeader
        eyebrow="Design system"
        title="Warm & Trustworthy"
        description="The shared visual language for the St. Joseph Daycare portal — Pine teal and Marigold on warm neutrals, Bricolage Grotesque over Plus Jakarta Sans."
        actions={<Button leftIcon={<SparklesIcon className="h-4 w-4" />}>Primary action</Button>}
      />

      <Section title="Color">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {swatches.map((swatch) => (
            <div key={swatch.name} className={`flex h-24 flex-col justify-end rounded-2xl p-3 ${swatch.className} ${swatch.text ?? ''}`}>
              <span className="text-sm font-bold">{swatch.name}</span>
              <span className="text-xs opacity-80">{swatch.hex}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Typography">
        <Card padding="lg" className="space-y-3">
          <p className="font-display text-4xl font-extrabold text-ink">Every child, cared for.</p>
          <p className="font-display text-2xl font-bold text-ink">Enrollment made simple</p>
          <p className="text-base text-ink-soft">
            Plus Jakarta Sans sets the body — friendly, legible, and calm for parents filling out forms and staff
            reviewing records.
          </p>
          <p className="text-sm text-muted">Muted supporting text · captions · helper copy</p>
        </Card>
      </Section>

      <Section title="Buttons">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary">Primary</Button>
          <Button variant="accent">Accent</Button>
          <Button variant="subtle">Subtle</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
          <Button isLoading>Loading</Button>
          <Button disabled>Disabled</Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg" leftIcon={<BabyIcon className="h-4 w-4" />}>
            Enroll a child
          </Button>
        </div>
      </Section>

      <Section title="Badges & status">
        <div className="flex flex-wrap items-center gap-2.5">
          <Badge tone="brand">Brand</Badge>
          <Badge tone="accent">Accent</Badge>
          <Badge tone="success">Success</Badge>
          <Badge tone="warning">Warning</Badge>
          <Badge tone="danger">Danger</Badge>
          <StatusPill status="Pending" />
          <StatusPill status="Approved" />
          <StatusPill status="Waitlisted" />
          <StatusPill status="Rejected" />
        </div>
      </Section>

      <Section title="Form controls">
        <Card padding="lg" className="grid gap-5 sm:grid-cols-2">
          <Field label="Child's first name" required>
            {({ id }) => <Input id={id} placeholder="Maria" />}
          </Field>
          <Field label="Program" hint="Assigned by age at enrollment">
            {({ id }) => (
              <Select id={id} defaultValue="prek1">
                <option value="ited">ITEd (Infant/Toddler)</option>
                <option value="prek1">Pre-Kindergarten 1</option>
                <option value="prek2">Pre-Kindergarten 2</option>
              </Select>
            )}
          </Field>
          <Field label="Email" error="Enter a valid email address">
            {({ id, invalid }) => <Input id={id} type="email" invalid={invalid} leftIcon={<MailIcon />} defaultValue="not-an-email" />}
          </Field>
          <Field label="Search" className="sm:col-span-1">
            {({ id }) => <Input id={id} leftIcon={<SearchIcon />} placeholder="Search applicants" />}
          </Field>
          <Field label="Notes" className="sm:col-span-2">
            {({ id }) => <Textarea id={id} placeholder="Add any details staff should know…" />}
          </Field>
        </Card>
      </Section>

      <Section title="Tabs & filters">
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            { id: 'applications', label: 'Applications', icon: <InboxIcon className="h-4 w-4" />, count: 12 },
            { id: 'sections', label: 'Sections', icon: <CalendarIcon className="h-4 w-4" /> },
            { id: 'messages', label: 'Messages', icon: <BellIcon className="h-4 w-4" />, count: 3 },
          ]}
        />
        <SegmentedControl
          value={segment}
          onChange={setSegment}
          options={[
            { value: 'all', label: 'All' },
            { value: 'pending', label: 'Pending' },
            { value: 'approved', label: 'Approved' },
          ]}
        />
      </Section>

      <Section title="Data table">
        <TableWrap>
          <Table>
            <THead>
              <TR>
                <TH>Child</TH>
                <TH>Program</TH>
                <TH sortable sortDirection="desc">
                  Submitted
                </TH>
                <TH>Status</TH>
              </TR>
            </THead>
            <TBody>
              {[
                { name: 'Maria Santos', program: 'Pre-K 1', date: 'Jul 8', status: 'Pending' },
                { name: 'Jose Cruz', program: 'ITEd', date: 'Jul 6', status: 'Approved' },
                { name: 'Ana Reyes', program: 'Pre-K 2', date: 'Jul 2', status: 'Waitlisted' },
              ].map((row) => (
                <TR key={row.name} className="hover:bg-surface-sunk">
                  <TD>
                    <span className="flex items-center gap-2.5">
                      <Avatar name={row.name} size="sm" />
                      <span className="font-semibold text-ink">{row.name}</span>
                    </span>
                  </TD>
                  <TD>{row.program}</TD>
                  <TD className="text-muted">{row.date}</TD>
                  <TD>
                    <StatusPill status={row.status} />
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </TableWrap>
      </Section>

      <Section title="Cards & composition">
        <div className="grid gap-4 sm:grid-cols-2">
          <Card padding="none">
            <CardHeader eyebrow="Guardian" title="Maria's application" description="Submitted 8 July 2026" actions={<StatusPill status="Pending" />} />
            <CardBody>
              <p className="text-sm text-ink-soft">Requirements: 3 of 5 uploaded. Awaiting birth certificate and proof of income.</p>
            </CardBody>
            <CardFooter>
              <Button variant="ghost" size="sm">
                View
              </Button>
              <Button size="sm">Review</Button>
            </CardFooter>
          </Card>
          <Card interactive className="flex items-center gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft text-accent-strong">
              <UserIcon className="h-6 w-6" />
            </span>
            <div>
              <p className="font-bold text-ink">Interactive card</p>
              <p className="text-sm text-muted">Hover to see the lift used on clickable items.</p>
            </div>
          </Card>
        </div>
      </Section>

      <Section title="Feedback & overlays">
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => toast.success('Saved', 'Application updated.')}>
            Success toast
          </Button>
          <Button variant="outline" onClick={() => toast.error('Something went wrong', 'Try again in a moment.')}>
            Error toast
          </Button>
          <Button variant="outline" onClick={() => setModalOpen(true)}>
            Open modal
          </Button>
          <Button variant="outline" onClick={() => setConfirmOpen(true)}>
            Confirm dialog
          </Button>
        </div>
      </Section>

      <Section title="Empty & loading">
        <div className="grid gap-4 sm:grid-cols-2">
          <EmptyState
            icon={<InboxIcon />}
            title="No messages yet"
            description="When families reach out, their conversations appear here."
            action={<Button size="sm">Start a message</Button>}
          />
          <Card padding="lg" className="space-y-4">
            <div className="flex items-center gap-3">
              <Spinner />
              <span className="text-sm text-muted">Loading applicants…</span>
            </div>
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-4/5" />
          </Card>
        </div>
      </Section>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Edit applicant"
        description="Update the child's core record."
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setModalOpen(false)}>Save changes</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Full name">{({ id }) => <Input id={id} defaultValue="Maria Santos" />}</Field>
          <Field label="Program">
            {({ id }) => (
              <Select id={id} defaultValue="prek1">
                <option value="ited">ITEd</option>
                <option value="prek1">Pre-Kindergarten 1</option>
                <option value="prek2">Pre-Kindergarten 2</option>
              </Select>
            )}
          </Field>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmOpen}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          toast.success('Record deleted');
        }}
        title="Delete this application?"
        message="This permanently removes the record and its uploaded files. This can't be undone."
        confirmLabel="Delete application"
      />
    </div>
  );
}

/** Kitchen-sink preview of the design system. Mounted via `#styleguide` in dev. */
export function StyleGuide() {
  return (
    <ToastProvider>
      <StyleGuideInner />
    </ToastProvider>
  );
}

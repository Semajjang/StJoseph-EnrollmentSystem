import { useEffect, useState } from 'react';
import { SaveIcon } from 'lucide-react';
import { AgeRule, fetchAgeRules, loadAgeRules, saveAgeRules } from '../../lib/ageRules';
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Field,
  Input,
  useToast,
} from '../../components/ui';

type EditableField = 'name' | 'ageLabel' | 'scheduleLabel' | 'timeLabel' | 'minMonths' | 'maxMonths';

/** Edit the program age bands stored in site_content (drives auto-assignment). */
export function AgeRuleEditor() {
  const toast = useToast();
  const [ageRules, setAgeRules] = useState<AgeRule[]>(() => loadAgeRules());
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let active = true;

    const loadProgramAgeRules = async () => {
      setIsLoading(true);
      try {
        const nextRules = await fetchAgeRules();
        if (active) {
          setAgeRules(nextRules);
        }
      } catch (error) {
        if (active) {
          toast.error('Unable to load age rules', error instanceof Error ? error.message : undefined);
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void loadProgramAgeRules();

    return () => {
      active = false;
    };
  }, [toast]);

  const updateAgeRule = (ruleId: AgeRule['id'], field: EditableField, value: string) => {
    setAgeRules((prev) =>
      prev.map((rule) => {
        if (rule.id !== ruleId) {
          return rule;
        }

        if (field === 'minMonths' || field === 'maxMonths') {
          const nextValue = Number(value);
          return {
            ...rule,
            [field]: Number.isNaN(nextValue) ? 0 : Math.max(0, Math.round(nextValue)),
          };
        }

        return { ...rule, [field]: value };
      }),
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const result = await saveAgeRules(ageRules);
      if (result.error) {
        throw result.error;
      }
      setAgeRules(result.rules);
      toast.success('Age rules saved', 'Guardian enrollment now uses the updated age bands.');
    } catch (error) {
      toast.error('Unable to save age rules', error instanceof Error ? error.message : undefined);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card padding="none">
      <CardHeader
        eyebrow="Program placement"
        title="Program age rules"
        description="These bands decide which program a learner is auto-assigned to at enrollment."
      />
      <CardBody>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {ageRules.map((rule) => (
            <div key={rule.id} className="space-y-4 rounded-2xl border border-line bg-surface-sunk/60 p-5">
              <Badge tone="brand" className="uppercase tracking-wide">
                {rule.id}
              </Badge>
              <Field label="Program name">
                {({ id }) => (
                  <Input
                    id={id}
                    value={rule.name}
                    onChange={(event) => updateAgeRule(rule.id, 'name', event.target.value)}
                  />
                )}
              </Field>
              <Field label="Display age label">
                {({ id }) => (
                  <Input
                    id={id}
                    value={rule.ageLabel}
                    onChange={(event) => updateAgeRule(rule.id, 'ageLabel', event.target.value)}
                  />
                )}
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Min months">
                  {({ id }) => (
                    <Input
                      id={id}
                      type="number"
                      min={0}
                      value={rule.minMonths}
                      onChange={(event) => updateAgeRule(rule.id, 'minMonths', event.target.value)}
                    />
                  )}
                </Field>
                <Field label="Max months">
                  {({ id }) => (
                    <Input
                      id={id}
                      type="number"
                      min={0}
                      value={rule.maxMonths}
                      onChange={(event) => updateAgeRule(rule.id, 'maxMonths', event.target.value)}
                    />
                  )}
                </Field>
              </div>
              <Field label="Schedule label">
                {({ id }) => (
                  <Input
                    id={id}
                    value={rule.scheduleLabel}
                    onChange={(event) => updateAgeRule(rule.id, 'scheduleLabel', event.target.value)}
                  />
                )}
              </Field>
              <Field label="Time label">
                {({ id }) => (
                  <Input
                    id={id}
                    value={rule.timeLabel}
                    onChange={(event) => updateAgeRule(rule.id, 'timeLabel', event.target.value)}
                  />
                )}
              </Field>
            </div>
          ))}
        </div>
      </CardBody>
      <CardFooter>
        <Button
          leftIcon={<SaveIcon className="h-4 w-4" />}
          onClick={handleSave}
          isLoading={isSaving}
          disabled={isLoading}
        >
          {isLoading ? 'Loading rules…' : 'Save age rules'}
        </Button>
      </CardFooter>
    </Card>
  );
}

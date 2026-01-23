export interface NpsTemplateProps {
  form: {
    id: string;
    title: string;
    description: string | null;
  };
  productName?: string | null;
}

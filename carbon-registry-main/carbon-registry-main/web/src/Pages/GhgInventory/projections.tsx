import { GHGProjectionsComponent, useConnection, useUserContext } from 'carbon-library_ci';
import { useTranslation } from 'react-i18next';

const GhgProjections = () => {
  const { t } = useTranslation(['ghgInventory']);
  return <GHGProjectionsComponent t={t}></GHGProjectionsComponent>;
};

export default GhgProjections;

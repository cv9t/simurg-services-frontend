import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import remoteDefinitions from '/module-federation.manifest.json';
import { routes } from '~/shared/config/routes';
import { useServiceState } from '../model/context';

export const useServiceAccessGuard = (): void => {
  const { services, isLoaded } = useServiceState();
  const location = useLocation();
  const navigate = useNavigate();

  const existingDefinition = remoteDefinitions.find((definition) =>
    location.pathname.includes(definition.routePath),
  );

  useEffect(() => {
    if (isLoaded && existingDefinition) {
      const existingService = services.find(
        (service) => service.name === existingDefinition.backendName,
      );
      if (existingService?.['status-code'] !== 200) {
        navigate(routes.home);
      }
    }
  }, [existingDefinition, isLoaded, navigate, services]);
};

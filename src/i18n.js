import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      common: {
        cancel: 'Cancel',
        close: 'Close',
        back_to_home: 'Back to Home',
        loading: 'Loading…'
      },
      auth: {
        welcome_back: 'Welcome Back',
        join_revolution: 'Join the Revolution',
        access_vault: 'Access your asset vault.',
        start_certifying: 'Start certifying your assets.',
        email: 'Email',
        password: 'Password',
        sign_in: 'Sign In',
        create_account: 'Create Account',
        dont_have_account: "Don't have an account? Sign Up",
        already_have_account: 'Already have an account? Sign In',
        continue_google: 'Continue with Google',
        show_password: 'Show password',
        hide_password: 'Hide password',
        accept_terms_prefix: 'I agree to the',
        terms: 'Terms of Service',
        and: 'and',
        privacy_policy: 'Privacy Policy',
        must_accept_terms: 'Please accept the Terms of Service and Privacy Policy to create an account.',
        invalid_email: 'Please enter a valid email.',
        password_min: 'Password must be at least 8 characters.',
        auth_failed: 'Authentication failed.',
        link_errors: {
          default: 'This link is invalid or has expired. Please try again.',
          otp_expired: 'This confirmation link has expired. Please request a new one.',
          access_denied: 'Access denied. Please try again.',
          invalid_request: 'Invalid request. Please try again.'
        }
      },
      nav: {
        vault: 'Vault',
        market: 'Market',
        scan: 'Scan',
        stats: 'Stats',
        profile: 'Profile'
      },
      vault: {
        certified_assets: 'Certified Assets',
        vault_dashboard: 'Vault Dashboard',
        add_item: 'Add Item',
        add_item_title: 'Register a Digital Passport',
        add_item_subtitle: 'Enter your DPP ID to add an authenticated asset.',
        dpp_id: 'DPP ID',
        condition: 'Condition',
        add_to_vault: 'Add to Vault',
        registering: 'Registering…',
        loading_vault: 'Loading your vault…',
        total_vault_value: 'Total Vault Value'
      },
      market: {
        circular_market: 'Circular Market',
        loading_marketplace: 'Loading marketplace…'
      },
      scan: {
        title: 'Scan Digital Passport (DPP)',
        loading_scanner: 'Loading scanner…',
        validating: 'Validating…',
        authenticated: 'Authenticated',
        verified: 'Verified'
      },
      stats: {
        your_impact: 'Your Impact',
        co2_avoided: 'CO2 avoided through circular asset flow.',
        impact_trend: 'Impact Trend',
        active_items: 'Active Items',
        reuse_score: 'Reuse Score'
      },
      profile: {
        member: 'Member',
        upgrade_elite: 'Upgrade to Elite (€19.99/mo)',
        manage_billing: 'Manage Billing',
        sign_out: 'Sign Out',
        language: 'Language'
      },
      listing: {
        toggle: 'Toggle Listing',
        updating: 'Updating…'
      },
      limits: {
        free_limit_reached: 'Free plan limit reached (3 items). Upgrade to Elite.',
        free_plan: 'Free plan: {{count}}/3 items'
      }
    }
  },
  fr: {
    translation: {
      common: {
        cancel: 'Annuler',
        close: 'Fermer',
        back_to_home: 'Retour à l’accueil',
        loading: 'Chargement…'
      },
      auth: {
        welcome_back: 'Bon retour',
        join_revolution: 'Rejoignez la révolution',
        access_vault: 'Accédez à votre coffre d’actifs.',
        start_certifying: 'Commencez à certifier vos actifs.',
        email: 'E-mail',
        password: 'Mot de passe',
        sign_in: 'Se connecter',
        create_account: 'Créer un compte',
        dont_have_account: "Vous n’avez pas de compte ? S’inscrire",
        already_have_account: 'Vous avez déjà un compte ? Se connecter',
        continue_google: 'Continuer avec Google',
        show_password: 'Afficher le mot de passe',
        hide_password: 'Masquer le mot de passe',
        accept_terms_prefix: 'J’accepte les',
        terms: 'Conditions d’utilisation',
        and: 'et la',
        privacy_policy: 'Politique de confidentialité',
        must_accept_terms: 'Veuillez accepter les Conditions d’utilisation et la Politique de confidentialité pour créer un compte.',
        invalid_email: 'Veuillez saisir un e-mail valide.',
        password_min: 'Le mot de passe doit contenir au moins 8 caractères.',
        auth_failed: 'Échec de l’authentification.',
        link_errors: {
          default: 'Ce lien est invalide ou a expiré. Veuillez réessayer.',
          otp_expired: 'Ce lien de confirmation a expiré. Veuillez en demander un nouveau.',
          access_denied: 'Accès refusé. Veuillez réessayer.',
          invalid_request: 'Requête invalide. Veuillez réessayer.'
        }
      },
      nav: {
        vault: 'Coffre',
        market: 'Marché',
        scan: 'Scanner',
        stats: 'Stats',
        profile: 'Profil'
      },
      vault: {
        certified_assets: 'Actifs certifiés',
        vault_dashboard: 'Tableau de bord',
        add_item: 'Ajouter',
        add_item_title: 'Enregistrer un passeport numérique',
        add_item_subtitle: 'Saisissez votre ID DPP pour ajouter un actif authentifié.',
        dpp_id: 'ID DPP',
        condition: 'État',
        add_to_vault: 'Ajouter au coffre',
        registering: 'Enregistrement…',
        loading_vault: 'Chargement du coffre…',
        total_vault_value: 'Valeur totale'
      },
      market: {
        circular_market: 'Marché circulaire',
        loading_marketplace: 'Chargement du marché…'
      },
      scan: {
        title: 'Scanner le passeport numérique (DPP)',
        loading_scanner: 'Chargement du scanner…',
        validating: 'Validation…',
        authenticated: 'Authentifié',
        verified: 'Vérifié'
      },
      stats: {
        your_impact: 'Votre impact',
        co2_avoided: 'CO2 évité grâce à l’économie circulaire.',
        impact_trend: 'Tendance d’impact',
        active_items: 'Actifs',
        reuse_score: 'Score de réutilisation'
      },
      profile: {
        member: 'Membre',
        upgrade_elite: 'Passer à Elite (19,99€/mois)',
        manage_billing: 'Gérer la facturation',
        sign_out: 'Se déconnecter',
        language: 'Langue'
      },
      listing: {
        toggle: 'Basculer l’annonce',
        updating: 'Mise à jour…'
      },
      limits: {
        free_limit_reached: 'Limite du plan gratuit atteinte (3). Passez à Elite.',
        free_plan: 'Plan gratuit : {{count}}/3 actifs'
      }
    }
  },
  de: {
    translation: {
      common: {
        cancel: 'Abbrechen',
        close: 'Schließen',
        back_to_home: 'Zur Startseite',
        loading: 'Lädt…'
      },
      auth: {
        welcome_back: 'Willkommen zurück',
        join_revolution: 'Mach mit',
        access_vault: 'Greife auf deinen Tresor zu.',
        start_certifying: 'Beginne, deine Assets zu zertifizieren.',
        email: 'E-Mail',
        password: 'Passwort',
        sign_in: 'Anmelden',
        create_account: 'Konto erstellen',
        dont_have_account: 'Noch kein Konto? Registrieren',
        already_have_account: 'Schon ein Konto? Anmelden',
        continue_google: 'Weiter mit Google',
        show_password: 'Passwort anzeigen',
        hide_password: 'Passwort verbergen',
        accept_terms_prefix: 'Ich stimme den',
        terms: 'Nutzungsbedingungen',
        and: 'und der',
        privacy_policy: 'Datenschutzerklärung',
        must_accept_terms: 'Bitte akzeptiere die Nutzungsbedingungen und Datenschutzerklärung, um ein Konto zu erstellen.',
        invalid_email: 'Bitte eine gültige E-Mail eingeben.',
        password_min: 'Passwort muss mindestens 8 Zeichen haben.',
        auth_failed: 'Authentifizierung fehlgeschlagen.',
        link_errors: {
          default: 'Dieser Link ist ungültig oder abgelaufen. Bitte versuche es erneut.',
          otp_expired: 'Dieser Bestätigungslink ist abgelaufen. Bitte fordere einen neuen an.',
          access_denied: 'Zugriff verweigert. Bitte versuche es erneut.',
          invalid_request: 'Ungültige Anfrage. Bitte versuche es erneut.'
        }
      },
      nav: {
        vault: 'Tresor',
        market: 'Markt',
        scan: 'Scan',
        stats: 'Statistiken',
        profile: 'Profil'
      },
      vault: {
        certified_assets: 'Zertifizierte Assets',
        vault_dashboard: 'Dashboard',
        add_item: 'Hinzufügen',
        add_item_title: 'Digitalen Pass registrieren',
        add_item_subtitle: 'Gib deine DPP-ID ein, um ein authentifiziertes Asset hinzuzufügen.',
        dpp_id: 'DPP-ID',
        condition: 'Zustand',
        add_to_vault: 'Zum Tresor hinzufügen',
        registering: 'Wird registriert…',
        loading_vault: 'Tresor wird geladen…',
        total_vault_value: 'Gesamtwert'
      },
      market: {
        circular_market: 'Kreislaufmarkt',
        loading_marketplace: 'Marktplatz lädt…'
      },
      scan: {
        title: 'Digitalen Pass (DPP) scannen',
        loading_scanner: 'Scanner lädt…',
        validating: 'Prüfen…',
        authenticated: 'Authentisch',
        verified: 'Verifiziert'
      },
      stats: {
        your_impact: 'Dein Impact',
        co2_avoided: 'CO2 eingespart durch Kreislaufwirtschaft.',
        impact_trend: 'Impact-Verlauf',
        active_items: 'Aktive Assets',
        reuse_score: 'Reuse-Score'
      },
      profile: {
        member: 'Mitglied',
        upgrade_elite: 'Auf Elite upgraden (19,99€/Monat)',
        manage_billing: 'Abo verwalten',
        sign_out: 'Abmelden',
        language: 'Sprache'
      },
      listing: {
        toggle: 'Listing umschalten',
        updating: 'Aktualisieren…'
      },
      limits: {
        free_limit_reached: 'Limit im Free-Plan erreicht (3). Upgrade auf Elite.',
        free_plan: 'Free-Plan: {{count}}/3 Assets'
      }
    }
  }
};

i18n.use(initReactI18next).init({
  resources,
  lng: 'en',
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false
  }
});

export default i18n;

export const LANGUAGES = [
  { code: 'en', label: 'EN' },
  { code: 'fr', label: 'FR' },
  { code: 'de', label: 'DE' }
];

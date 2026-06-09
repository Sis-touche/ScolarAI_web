import {
  FiBarChart2,
  FiSearch,
  FiCalendar,
  FiShield,
  FiXCircle,
} from "react-icons/fi";
import { HiOutlineSparkles } from "react-icons/hi2";
export const SECTIONS = [
  {
    id: "objet",
    num: "1",
    title: "Objet du Service",
    content: [
      {
        type: "text",
        subtitle: "a. Nature de la plateforme Scholar AI",
        text: "L’application Scholar AI fournit un service d’intelligence artificielle permettant aux utilisateurs (élèves, étudiants, parents ou enseignants) de numériser, transcrire et organiser des notes manuscrites, des fiches ou des tableaux directement en textes clairs et réutilisables, notamment sous forme de fichiers Excel ou textuels.",
      },
      {
        type: "text",
        subtitle: "b. Acceptation des conditions",
        text: "En accédant au service ou en créant un compte, l'utilisateur accepte sans réserve les présentes conditions générales d'utilisation. L'accès aux fonctionnalités avancées de transcription est conditionné par la détention d'un abonnement valide.",
      },
      {
        type: "highlight-grid",
        items: [
          {
            icon: HiOutlineSparkles,
            title: "Transcription Intelligente",
            description: "Conversion instantanée de l'écrit manuscrit vers le format numérique éditable.",
          },
          {
            icon: FiBarChart2,
            title: "Export Structuré",
            description: "Génération automatique de fichiers Excel organisés en quelques secondes.",
          },
        ],
      },
    ],
  },
  {
    id: "abonnements",
    num: "2",
    title: "Modalités d'Abonnement et Forfaits",
    content: [
      {
        type: "text",
        subtitle: "a. Forfaits à l'usage ou à la durée",
        text: "Les abonnements définissent un quota de scans disponibles (crédits de numérisation) ou une période de validité spécifique, caractérisée par une date de début et une date de fin précises.",
      },
      {
        type: "text",
        subtitle: "b. Suivi de la consommation",
        text: "L'utilisateur peut suivre en temps réel ses volumes restants via son tableau de bord d'abonnement personnel (ex: '🔍 X scans restants'). Les crédits non consommés à la fin d'une période de validité fixe ne sont pas reportables, sauf mention contraire explicite de l'offre.",
      },
      {
        type: "highlight-grid",
        items: [
          {
            icon: FiSearch,
            title: "Quota Transparent",
            description: "Visibilité totale sur le nombre de scans restants directement depuis votre espace.",
          },
          {
            icon: FiCalendar,
            title: "Période Fixe",
            description: "Validité des offres calquée sur le calendrier académique pour un usage optimal.",
          },
        ],
      },
    ],
  },
  {
    id: "paiement",
    num: "3",
    title: "Paiement et Échelonnement",
    content: [
      {
        type: "text",
        subtitle: "a. Options de paiement unique ou échelonné",
        text: "Pour faciliter l'accès aux forfaits, la plateforme intègre un système flexible de règlement. Selon l’offre choisie, le montant total d’un abonnement peut être échelonné en plusieurs tranches de paiement (Installments) définies à l'avance.",
      },
      {
        type: "text",
        subtitle: "b. Échéances et conséquences de retard",
        text: "Chaque tranche possède une date limite de paiement (due date). En cas de non-paiement à l’échéance, la tranche et l’abonnement global basculent sous le statut 'En retard' (overdue), ce qui restreint ou suspend immédiatement l’accès aux fonctionnalités de transcription.",
      },
      {
        type: "text",
        subtitle: "c. Canaux de paiement interopérables",
        text: "Les règlements s'effectuent via les canaux sécurisés intégrés sur la plateforme, incluant notamment le Mobile Money, la Carte bancaire, le Virement ou les règlements en Espèces auprès des points agréés.",
      },
    ],
  },
  {
    id: "propriete",
    num: "4",
    title: "Propriété Intellectuelle et Données",
    content: [
      {
        type: "text",
        subtitle: "a. Propriété des documents téléversés",
        text: "L'utilisateur conserve l'entière propriété des notes manuscrites, documents et images qu'il téléverse sur la plateforme aux fins de numérisation. Scholar AI ne revendique aucun droit sur vos données d'apprentissage ou de cours.",
      },
      {
        type: "text",
        subtitle: "b. Responsabilité du contenu",
        text: "L'utilisateur s'engage à ne pas soumettre de documents violant la législation en vigueur, les droits de propriété intellectuelle de tiers, ou contenant des contenus illicites. La plateforme se réserve le droit de suspendre l'accès en cas d'abus.",
      },
      {
        type: "highlight-grid",
        items: [
          {
            icon: FiShield,
            title: "Confidentialité Totale",
            description: "Vos documents et fichiers transcrits restent strictement privés et sécurisés.",
          },
          {
            icon: FiXCircle,
            title: "Usage Conforme",
            description: "Interdiction stricte de détourner l'infrastructure IA pour des fichiers corrompus.",
          },
        ],
      },
    ],
  },
  {
    id: "resiliation",
    num: "5",
    title: "Résiliation et Fin d'Abonnement",
    content: [
      {
        type: "text",
        subtitle: "a. Expiration naturelle",
        text: "Un abonnement prend fin automatiquement à sa date d'expiration planifiée ou lorsque le quota de scans associés est entièrement consommé par l'utilisateur.",
      },
      {
        type: "text",
        subtitle: "b. Régularisation des impayés",
        text: "La résiliation ou l'interruption d'un abonnement n'efface pas les dettes contractées sur les tranches de paiement passées ou en retard. Ces tranches restent dues pour régulariser la situation du compte et débloquer les exports historiques.",
      },
    ],
  },
];
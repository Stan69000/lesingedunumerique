---
title: "Comprendre l'asynchrone en JS"
description: "Un guide complet pour enfin maîtriser les Promises et async/await sans maux de tête."
pubDate: 2026-03-27
tags: ["JavaScript", "Avancé", "Tuto"]
author: "L'équipe Tech"
---

# L'asynchrone, c'est pas sorcier

JavaScript est un langage asynchrone. Cela signifie qu'il peut lancer une tâche et passer à la suivante sans attendre la fin de la première.

## Les Promises

Une Promise, c'est comme une promesse dans la vraie vie : elle peut être **tenue** (résolue) ou **non tenue** (rejetée).

```javascript
const maPromesse = new Promise((resolve, reject) => {
  // Simulation d'une tâche
  setTimeout(() => {
    resolve('C\'est fini !');
  }, 1000);
});
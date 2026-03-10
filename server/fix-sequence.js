/**
 * Ajusta a sequência global de OS no Postgres
 * para o maior seq existente.
 */

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

(async () => {
  try {
    if (!process.env.DATABASE_URL) {
      console.error("Defina DATABASE_URL antes de rodar.");
      process.exit(1);
    }

    // pega o maior seq existente
    const agg = await prisma.oS.aggregate({
      _max: { seq: true }
    });
    const maxSeq = agg?._max?.seq || 0;

    console.log("Maior seq encontrado no banco:", maxSeq);

    // ajusta OSSequence.last
    const seqRow = await prisma.oSSequence.findUnique({
      where: { id: 1 }
    });

    if (!seqRow) {
      await prisma.oSSequence.create({
        data: { id: 1, last: maxSeq }
      });
      console.log("Criada linha OSSequence com last =", maxSeq);
    } else {
      await prisma.oSSequence.update({
        where: { id: 1 },
        data: { last: maxSeq }
      });
      console.log("Atualizado OSSequence.last para:", maxSeq);
    }

    const finalState = await prisma.oSSequence.findUnique({ where: { id: 1 } });
    console.log("Estado final:", finalState);
  } catch (e) {
    console.error("Erro:", e);
  } finally {
    await prisma.$disconnect();
  }
})();
``